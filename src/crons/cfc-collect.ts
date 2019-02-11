import { Injectable } from '@nestjs/common';
import bunyan from 'bunyan';
import Web3 from 'web3';
import { CfcService, CoinEnum } from '../coins';
import { ConfigService } from '../config/config.service';
import { Erc20Collect } from './erc20-collect';

const { CFC } = CoinEnum;

@Injectable()
export class CfcCollect extends Erc20Collect {
  constructor(
    config: ConfigService,
    logger: bunyan,
    web3: Web3,
    cfcService: CfcService,
  ) {
    super(config, logger, web3, CFC, cfcService);
  }
}
