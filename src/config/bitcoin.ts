export default class EthereumConfig {
  public static bech32 = false;

  static get rpc() {
    return {
      host: process.env.BITCOIND_HOST,
      network: process.env.BITCOIND_NETWORK as
        | 'mainnet'
        | 'testnet'
        | 'regtest',
      password: process.env.BITCOIND_PASSWORD,
      port: process.env.BITCOIND_PORT,
      username: process.env.BITCOIND_USERNAME,
    };
  }

  public static btc = {
    confThreshold: 2,
    fee: {
      confTarget: 6,
      txSizeKb: 0.4,
    },
    withdrawalStep: 512,
  };

  public static usdt = {};
}
