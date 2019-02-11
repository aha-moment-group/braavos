import { Injectable } from '@nestjs/common';
import bunyan from 'bunyan';
import Web3 from 'web3';
import { AmqpService } from '../amqp/amqp.service';
import { CfcService, CoinEnum } from '../coins';
import { ConfigService } from '../config/config.service';
import { Erc20Deposit } from './erc20-deposit';

const { CFC } = CoinEnum;

@Injectable()
export class CfcDeposit extends Erc20Deposit {
  constructor(
    config: ConfigService,
    logger: bunyan,
    web3: Web3,
    amqpService: AmqpService,
    cfcService: CfcService,
  ) {
    super(config, logger, amqpService, web3, CFC, cfcService.abi);
  }
}
