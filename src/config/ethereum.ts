import { CoinEnum } from '../coins';

export default class EthereumConfig {
  public static get web3() {
    const res = process.env.WEB3_RPC;
    if (!res || !res.startsWith('http')) {
      throw new Error();
    }
    return res;
  }

  public static get bmartHost() {
    const res = process.env.BMART_HOST;
    if (!res) {
      throw new Error();
    }
    return res;
  }

  public static get bmartKey() {
    const res = process.env.BMART_KEY;
    if (!res) {
      throw new Error();
    }
    return res;
  }

  public static get bmartSecret() {
    const res = process.env.BMART_SECRET;
    if (!res) {
      throw new Error();
    }
    return res;
  }

  public static get pocketAddr() {
    const res = process.env.POCKET_ADDR;
    if (!res) {
      throw new Error();
    }
    return res;
  }

  public static get pocketPrv() {
    const res = process.env.POCKET_PRV;
    if (!res) {
      throw new Error();
    }
    return res;
  }

  public static ETH = {
    collect: {
      confThreshold: 10,
    },
    deposit: {
      minimumThreshold: 10000000000000000, // 0.01 ether
      step: 60,
    },
    withdraw: {},
  };

  public static get CFC() {
    return {
      collect: {
        confThreshold: 10,
        decimals: 8,
      },
      contractAddr: (() => {
        const res = process.env.CFC_CONTRACT_ADDR;
        if (!res) {
          throw new Error();
        }
        return res;
      })(),
      deposit: {
        _from: '_from',
        _to: '_to',
        _value: '_value',
        decimals: 8,
        minThreshold: 10,
        step: 300,
      },
      withdraw: {
        decimals: 8,
      },
    };
  }

  public static get(symbol: CoinEnum) {
    // tslint:disable-next-line:no-small-switch
    switch (symbol) {
      case CoinEnum.CFC:
        return this.CFC;
      default:
        throw new Error();
    }
  }
}
