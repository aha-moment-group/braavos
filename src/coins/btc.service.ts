import { Inject, Injectable } from '@nestjs/common';
import BtcRpc from 'bitcoin-core';
import { BitcoinService } from '../chains';
import { ConfigService } from '../config/config.service';

@Injectable()
export class BtcService extends BitcoinService {
  constructor(@Inject('ConfigService') config: ConfigService, rpc: BtcRpc) {
    super(config, rpc);
  }
}
