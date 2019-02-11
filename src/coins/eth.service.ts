import { Inject, Injectable } from '@nestjs/common';
import Web3 from 'web3';
import { EthereumService } from '../chains';
import { ConfigService } from '../config/config.service';

@Injectable()
export class EthService extends EthereumService {
  constructor(@Inject('ConfigService') config: ConfigService, web3: Web3) {
    super(config, web3);
  }
}
