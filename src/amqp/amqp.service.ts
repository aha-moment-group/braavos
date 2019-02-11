import { Inject, Injectable } from '@nestjs/common';
import { Connection } from 'amqplib';
import bunyan from 'bunyan';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { InjectAmqpConnection } from 'nestjs-amqp';
import { getManager } from 'typeorm';
import { ChainService } from '../chains';
import { CoinEnum } from '../coins';
import { Account } from '../entities/account.entity';
import { Deposit } from '../entities/deposit.entity';
import { Withdrawal } from '../entities/withdrawal.entity';
import { CreateWithdrawalDto } from './create-withdrawal.dto';

@Injectable()
export class AmqpService {
  private readonly logger: bunyan;
  private readonly connection: Connection;
  private readonly coinServices: { [_ in CoinEnum]?: ChainService };

  constructor(
    logger: bunyan,
    @InjectAmqpConnection() connection: Connection,
    @Inject('CoinServiceRepo') coinServices: { [_ in CoinEnum]?: ChainService },
  ) {
    this.logger = logger;
    this.connection = connection;
    this.coinServices = coinServices;
    this.assertQueues();
    this.createWithdrawal();
  }

  public async updateWithdrawal(withdrawal: Withdrawal): Promise<void> {
    await this.publish('withdrawal_update', withdrawal);
  }

  public async createDeposit(deposit: Deposit): Promise<void> {
    await this.publish('deposit_creation', deposit);
  }

  public async updateDeposit(deposit: Deposit): Promise<void> {
    await this.publish('deposit_update', deposit);
  }

  private async publish(queue: string, message: any): Promise<void> {
    try {
      const channel = await this.connection.createConfirmChannel();
      await channel.assertQueue(queue);
      channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
    } catch (err) {
      this.logger.error(`sendToQueue(${queue}, ${message}) failed`);
    }
  }

  private async assertQueues(): Promise<void> {
    const channel = await this.connection.createChannel();
    await Promise.all([
      channel.assertQueue('deposit_creation', { durable: true }),
      channel.assertQueue('deposit_update', { durable: true }),
      channel.assertQueue('withdrawal_update', { durable: true }),
    ]);
  }

  private async createWithdrawal(): Promise<void> {
    const channel = await this.connection.createChannel();
    const queue = 'withdrawal_creation';
    await channel.assertQueue(queue, { durable: true });
    await channel.consume(queue, async (msg) => {
      if (!msg) {
        throw new Error();
      }
      const body = plainToClass(CreateWithdrawalDto, JSON.parse(
        msg.content.toString(),
      ) as object);
      // TODO check this out
      await validate(body);
      const clientId = 0;
      if (
        await Withdrawal.findOne({
          clientId,
          key: body.key,
        })
      ) {
        this.logger.info(
          `consuming existed withdrawal from client #${clientId}: ` +
            JSON.stringify(body),
        );
        channel.ack(msg);
        return;
      }
      const coinService = this.coinServices[body.coinSymbol];
      if (!coinService) {
        this.logger.info(
          `consuming withdrawal with unrecognisable coin symbol from client #` +
            `${clientId}: ${JSON.stringify(body)}`,
        );
        channel.ack(msg);
        return;
      }
      if (!coinService.isValidAddress(body.recipient)) {
        this.logger.info(
          `consuming withdrawal with invalid address from client ` +
            `#${clientId}: ${JSON.stringify(body)}`,
        );
        channel.ack(msg);
        return;
      }
      await Account.createQueryBuilder()
        .insert()
        .values({ clientId, coinSymbol: body.coinSymbol })
        .onConflict('("clientId", "coinSymbol") DO NOTHING')
        .execute();
      await getManager().transaction(async (manager) => {
        const account = await manager
          .createQueryBuilder(Account, 'account')
          .where({ clientId, coinSymbol: body.coinSymbol })
          .setLock('pessimistic_write')
          .getOne();
        if (!account) {
          this.logger.error(
            `account (${clientId}, ${body.coinSymbol}) does not exist`,
          );
          channel.nack(msg);
          return;
        }
        await Promise.all([
          manager.decrement(
            Account,
            { clientId, coinSymbol: body.coinSymbol },
            'balance',
            Number(body.amount),
          ),
          manager
            .createQueryBuilder()
            .insert()
            .into(Withdrawal)
            .values({
              amount: body.amount,
              clientId,
              coinSymbol: body.coinSymbol,
              key: body.key,
              memo: body.memo,
              recipient: body.recipient,
            })
            .execute(),
        ]);
      });
      this.logger.debug('consuming withdrawal ' + JSON.stringify(body));
      channel.ack(msg);
    });
  }
}
