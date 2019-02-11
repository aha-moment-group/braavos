import { Injectable } from '@nestjs/common';
import BtcRpc from 'bitcoin-core';
import { Cron, NestSchedule } from 'nest-schedule';
import { getManager } from 'typeorm';
import { AmqpService } from '../amqp/amqp.service';
import { CoinEnum } from '../coins';
import { ConfigService } from '../config/config.service';
import { Account } from '../entities/account.entity';
import { DepositStatus } from '../entities/deposit-status.enum';
import { Deposit } from '../entities/deposit.entity';

const { BTC } = CoinEnum;

@Injectable()
export class BtcUpdateDeposit extends NestSchedule {
  private readonly amqpService: AmqpService;
  private readonly rpc: BtcRpc;
  private readonly confThreshold: number;

  constructor(amqpService: AmqpService, rpc: BtcRpc, config: ConfigService) {
    super();
    this.amqpService = amqpService;
    this.rpc = rpc;
    this.confThreshold = config.bitcoin.btc.confThreshold;
  }

  @Cron('*/1 * * * *')
  public async cron(): Promise<void> {
    await getManager().transaction(async (manager) => {
      for (const d of await manager
        .createQueryBuilder(Deposit, 'd')
        .where({ coinSymbol: BTC, status: DepositStatus.unconfirmed })
        .setLock('pessimistic_write')
        .getMany()) {
        if (!d.txHash) {
          throw new Error();
        }
        if (
          (await this.rpc.getTransaction(d.txHash)).confirmations <
          this.confThreshold
        ) {
          continue;
        }
        await Promise.all([
          manager.update(
            Deposit,
            { id: d.id },
            { status: DepositStatus.confirmed },
          ),
          manager
            .createQueryBuilder()
            .insert()
            .into(Account)
            .values({ clientId: d.clientId, coinSymbol: BTC })
            .onConflict('("clientId", "coinSymbol") DO NOTHING')
            .execute(),
          manager.increment(
            Account,
            { clientId: d.clientId, coinSymbol: BTC },
            'balance',
            Number(d.amount),
          ),
        ]);
        this.amqpService.updateDeposit(
          await manager.findOneOrFail(Deposit, { id: d.id }),
        );
      }
    });
  }
}
