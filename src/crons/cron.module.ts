import { LoggingBunyan } from '@google-cloud/logging-bunyan';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import BtcRpc from 'bitcoin-core';
import bunyan from 'bunyan';
import { AmqpModule } from 'nestjs-amqp';
import Web3 from 'web3';
import { AmqpService } from '../amqp/amqp.service';
import { BtcService, CfcService, CoinEnum, EthService } from '../coins';
import { ConfigModule } from '../config/config.module';
import { ConfigService } from '../config/config.service';
import { BtcCreateDeposit } from './btc-create-deposit';
import { BtcRefreshFee } from './btc-refresh-fee';
import { BtcUpdateDeposit } from './btc-update-deposit';
import { BtcUpdateWithdrawal } from './btc-update-withdrawal';
import { CfcCollect } from './cfc-collect';
import { CfcConfirm } from './cfc-confirm';
import { CfcDeposit } from './cfc-deposit';
import { CfcWithdrawal } from './cfc-withdrawal';
import { EthCollect } from './eth-collect';
import { EthConfirm } from './eth-confirm';
import { EthDeposit } from './eth-deposit';
import { EthWithdrawal } from './eth-withdrawal';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useExisting: ConfigService,
    }),
    AmqpModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.amqp as any,
    }),
  ],
  providers: [
    {
      inject: [ConfigService],
      provide: bunyan,
      useFactory: (config: ConfigService) =>
        bunyan.createLogger({
          name: 'braavos-crons',
          streams: config.isProduction
            ? [
                { level: bunyan.DEBUG, stream: process.stdout },
                new LoggingBunyan().stream(bunyan.DEBUG),
              ]
            : [{ level: bunyan.DEBUG, stream: process.stdout }],
        }),
    },
    {
      inject: [ConfigService],
      provide: BtcRpc,
      useFactory: (config: ConfigService) => new BtcRpc(config.bitcoin.rpc),
    },
    {
      inject: [ConfigService],
      provide: Web3,
      useFactory: (config: ConfigService) =>
        new Web3(new Web3.providers.HttpProvider(config.ethereum.web3)),
    },
    AmqpService,
    {
      inject: [BtcService, EthService, CfcService],
      provide: 'CoinServiceRepo',
      useFactory: (
        btcService: BtcService,
        ethService: EthService,
        cfcService: CfcService,
      ) => ({
        [CoinEnum.BTC]: btcService,
        [CoinEnum.ETH]: ethService,
        [CoinEnum.CFC]: cfcService,
      }),
    },
    // coin services
    BtcService,
    EthService,
    CfcService,
    // crons
    BtcCreateDeposit,
    BtcRefreshFee,
    BtcUpdateDeposit,
    BtcUpdateWithdrawal,

    EthDeposit,
    EthConfirm,
    EthCollect,
    EthWithdrawal,
    EthService,

    CfcDeposit,
    CfcConfirm,
    CfcCollect,
    CfcWithdrawal,
  ],
})
export class CronModule {}
