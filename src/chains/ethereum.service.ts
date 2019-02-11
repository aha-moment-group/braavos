import { EthereumHDKey, fromMasterSeed } from 'ethereumjs-wallet/hdkey';
import Web3 from 'web3';
import { ConfigService } from '../config/config.service';
import { Addr } from '../entities/addr.entity';
import { ChainEnum } from './chain.enum';
import { ChainService } from './chain.service';

const { ethereum } = ChainEnum;

export class EthereumService extends ChainService {
  protected readonly hdkey: EthereumHDKey;
  private readonly web3: Web3;

  constructor(config: ConfigService, web3: Web3) {
    super();
    const seed = config.seed;
    this.hdkey = fromMasterSeed(seed);
    this.web3 = web3;
  }

  public async getAddr(clientId: number, path0: string): Promise<string> {
    const path1 = `m/44'/60'/0'/${clientId}/${path0}`;
    const addr = this.web3.utils.toChecksumAddress(
      this.hdkey
        .derivePath(path1)
        .getWallet()
        .getAddressString(),
    );
    if (clientId === 0 && path0 === '0') {
      return addr;
    }
    await Addr.createQueryBuilder()
      .insert()
      .into(Addr)
      .values({
        addr,
        chain: ethereum,
        clientId,
        path: path0,
      })
      .onConflict('("chain", "clientId", "path") DO NOTHING')
      .execute();
    const res = await Addr.findOne({ chain: ethereum, clientId, path: path0 });
    if (res && !res.info.nonce) {
      res.info.nonce = await this.web3.eth.getTransactionCount(addr);
      await res.save();
    }
    return addr;
  }

  public isValidAddress(addr: string): boolean {
    return this.web3.utils.isAddress(addr);
  }

  public getPrivateKey(clientId: number, path0: string): string {
    const path1 = `m/44'/60'/0'/${clientId}/${path0}`;
    return this.hdkey
      .derivePath(path1)
      .getWallet()
      .getPrivateKeyString();
  }
}
