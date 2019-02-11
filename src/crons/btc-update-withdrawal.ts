import { Injectable } from '@nestjs/common';
import BtcRpc, { ListTransactionsResult } from 'bitcoin-core';
import bunyan from 'bunyan';
import { Cron, NestSchedule } from 'nest-schedule';
import { EntityManager, getManager } from 'typeorm';
import { AmqpService } from '../amqp/amqp.service';
import { CoinEnum } from '../coins';
import { ConfigService } from '../config/config.service';
import { Account } from '../entities/account.entity';
import { Coin } from '../entities/coin.entity';
import { WithdrawalStatus } from '../entities/withdrawal-status.enum';
import { Withdrawal } from '../entities/withdrawal.entity';

const { BTC } = CoinEnum;

@Injectable()
export class BtcUpdateWithdrawal extends NestSchedule {
  private readonly logger: bunyan;
  private readonly rpc: BtcRpc;
  private readonly amqpService: AmqpService;
  private readonly confThreshold: number;
  private readonly step: number;

  constructor(
    config: ConfigService,
    logger: bunyan,
    amqpService: AmqpService,
    rpc: BtcRpc,
  ) {
    super();
    this.logger = logger;
    this.amqpService = amqpService;
    this.rpc = rpc;
    this.confThreshold = config.bitcoin.btc.confThreshold;
    this.step = config.bitcoin.btc.withdrawalStep;
  }

  @Cron('*/10 * * * *')
  public async cron(): Promise<void> {
    await getManager().transaction(async (manager) => {
      const btc = await manager
        .createQueryBuilder(Coin, 'c')
        .where({ symbol: BTC })
        .setLock('pessimistic_write')
        .getOne();
      if (!btc) {
        throw new Error();
      }
      const lastMilestone = btc.info.withdrawalMilestone as string;
      const task = await this.taskSelector(manager, lastMilestone);
      if (task) {
        await task();
      }
    });
  }

  private async taskSelector(
    manager: EntityManager,
    lastMilestone: string,
  ): Promise<(() => Promise<void>) | void> {
    const w = await manager
      .createQueryBuilder(Withdrawal, 'w')
      .where({
        status: WithdrawalStatus.created,
        symbol: BTC,
      })
      .orderBy('id', 'ASC')
      .getOne();
    if (!w) {
      return;
    }
    let cursor = 0;
    while (true) {
      const txs = await this.rpc.listTransactions('*', 64, cursor);
      if (txs.length === 0) {
        return this.broadcast(manager);
      }
      for (const tx of txs.filter(
        (t) => t.category === 'send' && Number(t.comment) > 0,
      )) {
        if (Number(tx.comment) >= w.id) {
          return this.credit(manager, lastMilestone);
        }
      }
      cursor += txs.length;
    }
  }

  private async broadcast(
    manager: EntityManager,
  ): Promise<() => Promise<void>> {
    return async () => {
      const ws = await manager
        .createQueryBuilder(Withdrawal, 'w')
        .where({
          coinSymbol: BTC,
          status: WithdrawalStatus.created,
        })
        .orderBy('id', 'ASC')
        .limit(this.step)
        .getMany();
      const m: { [_: string]: string } = {};
      let lastId;
      for (const w of ws) {
        if (w.recipient in m) {
          break;
        }
        m[w.recipient] = w.amount;
        lastId = w.id;
      }
      await this.rpc.sendMany('', m, this.confThreshold, String(lastId));
    };
  }

  private async credit(
    manager: EntityManager,
    withdrawalMilestone: string,
  ): Promise<() => Promise<void>> {
    return async () => {
      let ws = await manager
        .createQueryBuilder(Withdrawal, 'w')
        .where(`"coinSymbol" = 'BTC' AND "status" = 'created'`, {})
        .setLock('pessimistic_write')
        .getMany();
      let txs = await this.getTxs(withdrawalMilestone);
      await manager.query(`
        update coin
        set
          info =
            info ||
            (
              '{ "withdrawalMilestone":' ||
              '"${txs.slice(-1)[0].txid}"' ||
              ' }'
            )::jsonb
        where symbol = 'BTC'
      `);
      const pivot = Math.max(...txs.map((t) => Number(t.comment)));
      ws = ws.filter((w) => w.id <= pivot);
      txs = txs.filter((t) => Number(t.comment) === pivot);
      if (ws.length !== txs.length) {
        throw new Error();
      }
      ws.sort((a, b) => (a.recipient < b.recipient ? -1 : 1));
      txs.sort((a, b) => (a.address < b.address ? -1 : 1));
      for (let i = 0; i < ws.length; i++) {
        if (
          ws[i].recipient !== txs[i].address ||
          Number(ws[i].amount) !== -txs[i].amount
        ) {
          throw new Error();
        }
        ws[i].txHash = txs[i].txid;
        ws[i].feeSymbol = BTC;
        // TODO BigNumber 向上取整
        ws[i].feeAmount = -txs[i].fee / txs.length;
        ws[i].status = WithdrawalStatus.finished;
        await manager.decrement(
          Account,
          { clientId: ws[i].clientId, coinSymbol: BTC },
          'balance',
          ws[i].feeAmount!,
        );
      }
      await manager.save(ws);
      await Promise.all(
        ws.map(async (w) => {
          await this.amqpService.updateWithdrawal(w);
        }),
      );
    };
  }

  private async getTxs(
    withdrawalMilestone: string,
  ): Promise<ListTransactionsResult[]> {
    let txs: ListTransactionsResult[] = [];
    let cursor = 0;
    while (true) {
      const tx = (await this.rpc.listTransactions('*', 64, cursor)).reverse();
      if (tx.length === 0) {
        return txs;
      }
      txs = [
        ...txs,
        ...tx.filter((t) => t.category === 'send' && Number(t.comment) > 0),
      ];
      cursor += tx.length;
      for (const t of tx) {
        if (t.txid === withdrawalMilestone) {
          return txs;
        }
      }
    }
  }
}
