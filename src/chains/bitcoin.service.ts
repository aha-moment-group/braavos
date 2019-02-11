import { BIP32, fromBase58, fromSeed } from 'bip32';
import BtcRpc from 'bitcoin-core';
import { Network, payments } from 'bitcoinjs-lib';
import { ConfigService } from '../config/config.service';
import { Addr } from '../entities/addr.entity';
import { ChainEnum } from './chain.enum';
import { ChainService } from './chain.service';

const { bitcoin } = ChainEnum;
const MAINNET: Network = {
  bech32: 'bc',
  bip32: { private: 0x0488ade4, public: 0x0488b21e },
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  pubKeyHash: 0x00,
  scriptHash: 0x05,
  wif: 0x80,
};
const TESTNET: Network = {
  bech32: 'tb',
  bip32: { private: 0x04358394, public: 0x043587cf },
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  wif: 0xef,
};

export class BitcoinService extends ChainService {
  protected readonly rpc: BtcRpc;
  private readonly prvNode: BIP32;
  private readonly bech32: boolean;
  private readonly network: Network;
  private readonly rAddr: RegExp;

  constructor(config: ConfigService, rpc: BtcRpc) {
    super();
    this.bech32 = config.bitcoin.bech32;
    const isMainnet = config.isProduction;
    this.network = isMainnet ? MAINNET : TESTNET;
    this.rAddr = isMainnet
      ? /^(bc1|1|3)[a-zA-HJ-NP-Z0-9]{25,39}$/
      : /^(tb1|m|n|2)[a-zA-HJ-NP-Z0-9]{25,39}$/;
    const seed = config.seed;
    const xPrv = fromSeed(seed, this.network)
      .derivePath(`m/84'/0'/0'`)
      .toBase58();
    this.prvNode = fromBase58(xPrv, this.network);
    this.rpc = rpc;
  }

  public async getAddr(clientId: number, path0: string): Promise<string> {
    const path1 = `${clientId}/${path0}`;
    const addr = this.bech32
      ? this.getAddrP2wpkh(path1)
      : this.getAddrP2sh(path1);
    if (!(await Addr.findOne({ chain: bitcoin, clientId, path: path0 }))) {
      await Addr.create({
        addr,
        chain: bitcoin,
        clientId,
        path: path0,
      }).save();
      await this.rpc.importPrivKey(
        this.getPrivateKey(clientId, path0),
        '',
        false,
      );
    }
    return addr;
  }

  public isValidAddress(addr: string): boolean {
    return this.rAddr.test(addr);
  }

  protected getPrivateKey(clientId: number, path0: string): string {
    const path1 = `${clientId}/${path0}`;
    return this.prvNode.derivePath(path1).toWIF();
  }

  // pay to script hash
  private getAddrP2sh(derivePath: string): string {
    const { address } = payments.p2sh({
      network: this.network,
      redeem: payments.p2wpkh({
        network: this.network,
        pubkey: this.prvNode.derivePath(derivePath).publicKey,
      }),
    });
    return address;
  }

  // pay to witness public key hash
  private getAddrP2wpkh(derivePath: string): string {
    const { address } = payments.p2wpkh({
      network: this.network,
      pubkey: this.prvNode.derivePath(derivePath).publicKey,
    });
    return address;
  }
}
