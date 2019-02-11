import { Injectable } from '@nestjs/common';
import bunyan from 'bunyan';
import { Cron, NestSchedule } from 'nest-schedule';
import { getManager } from 'typeorm';
import Web3 from 'web3';
import { TxSignature } from 'web3/eth/accounts';
import { AmqpService } from '../amqp/amqp.service';
import { CoinEnum, EthService } from '../coins';
import { ConfigService } from '../config/config.service';
import { WithdrawalStatus } from '../entities/withdrawal-status.enum';
import { Withdrawal } from '../entities/withdrawal.entity';

const { ETH } = CoinEnum;

@Injectable()
export class EthWithdrawal extends NestSchedule {
  private readonly web3: Web3;
  private readonly config: ConfigService;
  private readonly logger: bunyan;
  private readonly amqpService: AmqpService;
  private readonly ethereumService: EthService;
  private readonly cronLock: any;

  constructor(
    config: ConfigService,
    logger: bunyan,
    web3: Web3,
    amqpService: AmqpService,
    ethereumService: EthService,
  ) {
    super();
    this.config = config;
    this.logger = logger;
    this.web3 = web3;
    this.amqpService = amqpService;
    this.ethereumService = ethereumService;
    this.cronLock = {
      withdrawalCron: false,
    };
  }

  @Cron('*/20 * * * * *')
  public async cron(): Promise<void> {
    if (this.cronLock.withdrawalCron === true) {
      this.logger.debug('last withdrawalCron still in handling');
      return;
    }
    this.cronLock.withdrawalCron = true;
    try {
      const collectAddr = await this.ethereumService.getAddr(0, '0');
      const prv = this.ethereumService.getPrivateKey(0, '0');
      while (true) {
        const wd = await Withdrawal.createQueryBuilder()
          .where({
            coinSymbol: ETH,
            status: WithdrawalStatus.created,
            txHash: null,
          })
          .orderBy(`info->'nonce'`)
          .getMany();
        if (wd.length <= 0) {
          this.logger.debug('no record');
          break;
        }
        for (const v of wd) {
          const dbNonce: any = await this.getDbNonce(v);
          const fullNodeNonce = await this.web3.eth.getTransactionCount(
            collectAddr,
          );
          /* compare nonce: db - fullNode */
          if (dbNonce < fullNodeNonce) {
            this.logger.fatal(
              `db nonce is less than full node nonce, db info: ${wd}`,
            );
            return;
          } else if (dbNonce > fullNodeNonce) {
            this.logger.info('still have some txs to be handled');
            continue;
          } else {
            await this.handleTx(v, collectAddr, dbNonce, prv);
          }
        }
      }
      this.cronLock.withdrawalCron = false;
      this.logger.debug('finish withdraw ether');
      return;
    } catch (err) {
      this.logger.error(err);
      this.cronLock.withdrawalCron = false;
    }
  }

  private async handleTx(
    v: Withdrawal,
    collectAddr: string,
    dbNonce: any,
    prv: string,
  ): Promise<void> {
    /* dbNonce === fullNodeNonce, broadcast transaction */
    const realGasPrice = await this.web3.eth.getGasPrice();
    /* add 30Gwei */
    const thisGasPrice = this.web3.utils
      .toBN(realGasPrice)
      .add(this.web3.utils.toBN(30000000000))
      .toString();
    const value = this.web3.utils.toBN(
      this.web3.utils.toWei(v.amount, 'ether'),
    );
    /* checkt balance */
    const balance = await this.web3.eth.getBalance(collectAddr);
    if (this.web3.utils.toBN(balance).lte(value)) {
      this.logger.error('wallet balance not enough');
      this.cronLock.withdrawalCron = false;
      return;
    }
    const signTx = await this.web3.eth.accounts.signTransaction(
      {
        gas: 22000,
        gasPrice: thisGasPrice,
        nonce: dbNonce,
        to: v.recipient,
        value: value.toString(),
      },
      prv,
    );
    this.logger.debug(`
      gasPrice: ${thisGasPrice}
      rawTransaction: ${signTx.rawTransaction}
    `);
    this.broadcastTx(signTx, v.id);
  }

  private async getDbNonce(wd: Withdrawal): Promise<any> {
    let dbNonce: any;
    if (wd.info.nonce === null || wd.info.nonce === undefined) {
      await getManager().transaction(async (manager) => {
        await manager.query(`
          select * from kv_pair
          where key = 'ethWithdrawalNonce'
          for update
        `);
        const uu = await manager.query(`
          update kv_pair
          set value = to_json(value::text::integer + 1)
          where key = 'ethWithdrawalNonce'
          returning value as nonce
        `);
        dbNonce = uu[0].nonce;
        dbNonce = dbNonce - 1;
        await manager.query(`
          update withdrawal
          set info = (info || ('{"nonce":' || (${dbNonce}) || '}')::jsonb)
          where id = ${wd.id}
        `);
      });
    } else {
      dbNonce = wd.info.nonce;
    }
    return dbNonce;
  }

  private async broadcastTx(signTx: TxSignature, wdId: number): Promise<void> {
    try {
      await this.web3.eth
        .sendSignedTransaction(signTx.rawTransaction)
        .on('transactionHash', async (hash) => {
          this.logger.info('withdrawTxHash: ' + hash);
          await Withdrawal.createQueryBuilder()
            .update()
            .set({ txHash: hash, status: WithdrawalStatus.finished })
            .where({ id: wdId })
            .execute();
          const ww = await Withdrawal.findOne({ id: wdId });
          if (ww) {
            await this.amqpService.updateWithdrawal(ww);
          }
          this.logger.info('Finish update db | eth');
        });
    } catch (error) {
      this.logger.error(error);
    }
  }
}
