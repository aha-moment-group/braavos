import { Injectable } from '@nestjs/common';
import BtcRpc from 'bitcoin-core';
import bunyan from 'bunyan';
import { Cron, NestSchedule } from 'nest-schedule';
import { CoinEnum } from '../coins';
import { ConfigService } from '../config/config.service';
import { Coin } from '../entities/coin.entity';

const { BTC } = CoinEnum;

@Injectable()
export class BtcRefreshFee extends NestSchedule {
  private readonly logger: bunyan;
  private readonly rpc: BtcRpc;
  private readonly confTarget: number;
  private readonly txSizeKb: number;

  constructor(config: ConfigService, logger: bunyan, rpc: BtcRpc) {
    super();
    this.confTarget = config.bitcoin.btc.fee.confTarget;
    this.txSizeKb = config.bitcoin.btc.fee.txSizeKb;
    this.logger = logger;
    this.rpc = rpc;
  }

  @Cron('*/10 * * * *')
  public async cron(): Promise<void> {
    const feeRate = (await this.rpc.estimateSmartFee(this.confTarget)).feerate;
    if (!feeRate || feeRate === -1) {
      this.logger.warn('wrong feeRate');
      return;
    }
    const fee = this.txSizeKb * feeRate;
    await Promise.all([
      this.rpc.setTxFee(feeRate),
      Coin.update({ symbol: BTC }, { withdrawalFeeAmount: fee }),
    ]);
  }
}
