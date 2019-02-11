// tslint:disable:max-classes-per-file

declare module 'ethereumjs-wallet' {
  export default class Wallet {
    public static fromPrivateKey(key: Buffer): Wallet;
    public static fromPublicKey(key: Buffer, nonstrict?: boolean): Wallet;
    public static fromV3(json: string, password: string): Wallet;
    public getPrivateKey(): Buffer;
    public getPrivateKeyString(): string;
    public getAddressString(): string;
  }
}

declare module 'ethereumjs-wallet/hdkey' {
  import Wallet from 'ethereumjs-wallet';

  class EthereumHDKey {
    public privateExtendedKey(): string;
    public publicExtendedKey(): string;
    public derivePath(path: string): EthereumHDKey;
    public deriveChild(index: number | string): EthereumHDKey;
    public getWallet(): Wallet;
  }

  function fromMasterSeed(seed: Buffer): EthereumHDKey;
  function fromExtendedKey(base58key: string): EthereumHDKey;
}
