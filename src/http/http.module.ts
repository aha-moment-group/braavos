import { LoggingBunyan } from '@google-cloud/logging-bunyan';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import BtcRpc from 'bitcoin-core';
import bunyan from 'bunyan';
import Web3 from 'web3';
import { BtcService, CfcService, CoinEnum, EthService } from '../coins';
import { ConfigModule } from '../config/config.module';
import { ConfigService } from '../config/config.service';
import { HttpController } from './http.controller';
import { SignatureStrategy } from './signature.strategy';

@Module({
  controllers: [HttpController],
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useExisting: ConfigService,
    }),
  ],
  providers: [
    SignatureStrategy,
    {
      inject: [ConfigService],
      provide: bunyan,
      useFactory: (config: ConfigService) =>
        bunyan.createLogger({
          name: 'braavos-http',
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
    BtcService,
    EthService,
    CfcService,
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
  ],
})
export class HttpModule {}
