import { Inject, Injectable } from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import Web3 from 'web3';
import { EthereumService } from '../../chains/ethereum.service';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class CfcService extends EthereumService {
  public abi: object;
  constructor(@Inject('ConfigService') config: ConfigService, web3: Web3) {
    super(config, web3);
    this.abi = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, `./abi.json`), 'ascii'),
    );
  }
}
