// TypeScript definition for bitcoin-core 2.0.0
// Contributor: Joe Miyamoto <joemphilps@gmail.com>
// Contributor: Daniel Zhou <danichau93@gmail.com>
// tslint:disable:interface-name
// tslint:disable:max-union-size
// tslint:disable:parameters-max-number
// tslint:disable:use-type-alias

declare module 'bitcoin-core' {
  export interface ClientConstructorOption {
    agentOptions?: any;
    headers?: boolean;
    host?: string;
    logger?: () => any;
    network?: 'mainnet' | 'regtest' | 'testnet';
    password?: string;
    port?: string | number;
    ssl?: any;
    timeout?: number;
    username?: string;
    version?: string;
  }

  interface Requester {
    unsupported?: any[];
    version?: any;
  }

  interface Parser {
    headers: boolean;
  }

  interface ScriptDecoded {
    asm: string;
    hex: string;
    type: string;
    reqSigs: number;
    addresses: string[];
    ps2h?: string;
  }

  interface FundRawTxOptions {
    changeAddress?: string;
    chnagePosition?: number;
    includeWatching?: boolean;
    lockUnspents?: boolean;
    feeRate?: number;
    subtractFeeFromOutputs?: number[];
    replaceable?: boolean;
    conf_target?: number;
    estimate_mode: FeeEstimateMode;
  }

  type FeeEstimateMode = 'UNSET' | 'ECONOMICAL' | 'CONSERVATIVE';

  interface TxStats {
    time: number;
    txcount: number;
    window_final_block_hash?: string;
    window_block_count?: number;
    window_tx_count?: number;
    window_interval?: number;
    txrate: number;
  }

  interface AddedNodeInfo {
    addednode: string;
    connected: boolean;
    addresses: Array<{
      address: string;
      connected: 'inbound' | 'outbound';
    }>;
  }

  interface MemoryStats {
    locked: {
      used: number;
      free: number;
      total: number;
      locked: number;
      chunks_used: number;
      chunks_free: number;
    };
  }

  interface NetworkInfo {
    version: number;
    subversion: string;
    protocolversion: number;
    localservices: string;
    localrelay: boolean;
    timeoffset: number;
    connections: number;
    networkactive: boolean;
    networks: Array<{
      name: string;
      limited: boolean;
      reachable: boolean;
      proxy: string;
      proxy_randomize_credentials: boolean;
    }>;
    relayfee: number;
    incrementalfee: number;
    localaddresses: Array<{
      address: string;
      port: number;
      score: number;
    }>;
    warnings?: string;
  }

  interface PeerInfo {
    id: number;
    addr: string;
    addrbind: string;
    addrlocal: string;
    services: string;
    relaytxs: boolean;
    lastsend: number;
    lastrecv: number;
    bytessent: number;
    bytesrecv: number;
    conntime: number;
    timeoffset: number;
    pingtime: number;
    minping: number;
    version: number;
    subver: string;
    inbound: boolean;
    addnode: boolean;
    startinheight: number;
    banscore: number;
    synced_headers: number;
    synced_blocks: number;
    inflight: number[];
    whitelisted: boolean;
    bytessent_per_msg: {
      [key: string]: number;
    };
    byterecv_per_msg: {
      [key: string]: number;
    };
  }

  interface NetTotals {
    totalbytesrecv: number;
    totalbytessent: number;
    timemlillis: number;
    uploadtarget: {
      timeframe: number;
      target: number;
      target_reached: boolean;
      save_historical_blocks: boolean;
      bytes_left_in_cycle: number;
      time_lef_in_cycle: number;
    };
  }

  interface ChainInfo {
    chain: string;
    blocks: number;
    headers: number;
    bestblockchash: number;
    difficulty: number;
    mediantime: number;
    verificationprogress: number;
    initialblockdownload: boolean;
    chainwork: string;
    size_on_disk: number;
    pruned: boolean;
    pruneheight: number;
    automatic_pruning: boolean;
    prune_target_size: number;
    softforks: Array<{
      id: string;
      version: number;
      reject: {
        status: boolean;
      };
    }>;
    bip9_softforks: {
      [key: string]: {
        status: 'defined' | 'started' | 'locked_in' | 'active' | 'failed';
      };
    };
    warnings?: string;
  }

  interface ChainTip {
    height: number;
    hash: string;
    branchlen: number;
    status:
      | 'active'
      | 'valid-fork'
      | 'valid-headers'
      | 'headers-only'
      | 'invalid';
  }

  interface Outpoint {
    id: string;
    index: number;
  }

  interface UTXO {
    height: number;
    value: number;
    scriptPubkey: {
      asm: string;
      hex: string;
      reqSigs: number;
      type: string;
      addresses: string[];
    };
  }

  interface UnspentTxInfo {
    txid: string;
    vout: number;
    address: string;
    acount: string;
    scriptPubKey: string;
    amount: number;
    confirmations: number;
    redeemScript: string;
    spendable: boolean;
    solvable: boolean;
    safe: boolean;
  }

  interface PrevOut {
    txid: string;
    vout: number;
    scriptPubKey: string;
    redeemScript?: string;
    amount: number;
  }

  interface UTXOStats {
    height: number;
    bestblock: string;
    transactions: number;
    txouts: number;
    bogosize: number;
    hash_serialized_2: string;
    disk_size: number;
    total_amount: number;
  }

  interface MempoolContent {
    [key: string]: {
      size: number;
      fee: number;
      modifiedfee: number;
      time: number;
      height: number;
      descendantcount: number;
      descendantsize: number;
      descendantfees: number;
      ancestorcount: number;
      ancestorsize: number;
      ancestorfees: number;
      wtxid: string;
      depends: string[];
    };
  }

  interface DecodedRawTransaction {
    txid: string;
    hash: string;
    size: number;
    vsize: number;
    version: number;
    locktime: number;
    vin: TxIn[];
    vout: TxOut[];
  }

  interface FetchedRawTransaction extends DecodedRawTransaction {
    hex: string;
    blockhash: string;
    confirmations: number;
    time: number;
    blocktime: number;
  }

  interface MiningInfo {
    blocks: number;
    currentblockweight: number;
    currentblocktx: number;
    difficulty: number;
    networkhashps: number;
    pooledtx: number;
    chain: 'main' | 'test' | 'regtest';
    warnings?: string;
  }

  interface MempoolInfo {
    size: number;
    bytes: number;
    usage: number;
    maxmempol: number;
    mempoolminfee: number;
    minrelaytxfee: number;
  }

  interface BlockHeader {
    hash: string;
    confirmations: number;
    height: number;
    version: number;
    versionHex: string;
    merkleroot: string;
    time: number;
    mediantime: number;
    nonce: number;
    bits: string;
    difficulty: number;
    chainwork: string;
    previoutsblockchash: string;
  }

  interface Block {
    hash: string;
    confirmations: number;
    strippedsize: number;
    size: number;
    weight: number;
    height: number;
    version: number;
    verxionHex: string;
    merkleroot: string;
    tx: Transaction[] | string;
    hex: string;
    time: number;
    mediantime: number;
    nonce: number;
    bits: string;
    difficulty: number;
    chainwork: string;
    previousblockhash: string;
    nextblockchash?: string;
  }

  interface Transaction {
    txid: string;
    hash: string;
    version: number;
    size: number;
    vsize: number;
    locktime: number;
    vin: TxIn[];
    vout: TxOut[];
  }

  interface TxIn {
    txid: string;
    vout: number;
    scriptSig: {
      asm: string;
      hex: string;
    };
    txinwitness?: string[];
    sequence: number;
  }

  interface TxInForCreateRaw {
    txid: string;
    vout: number;
    sequence?: number;
  }

  interface TxOut {
    value: number;
    n: number;
    scriptPubKey: {
      asm: string;
      hex: string;
      reqSigs: number;
      type: scriptPubkeyType;
      addresses: string[];
    };
  }

  interface TxOutForCreateRaw {
    address: string;
    data: string;
  }

  interface TxOutInBlock {
    bestblock: string;
    confirmations: number;
    value: number;
    scriptPubKey: {
      asm: string;
      hex: string;
      reqSigs: number;
      type: scriptPubkeyType;
      addresses: string[];
    };
    coinbase: boolean;
  }

  interface DecodedScript {
    asm: string;
    hex: string;
    type: string;
    reqSigs: number;
    addresses: string[];
    p2sh: string;
  }

  interface WalletTransaction {
    amount: number;
    fee: number;
    confirmations: number;
    blockhash: string;
    blockindex: number;
    blocktime: number;
    txid: string;
    time: number;
    timereceived: number;
    'bip125-replaceable': 'yes' | 'no' | 'unknown';
    details: Array<{
      account: string;
      address: string;
      category: 'send' | 'receive';
      amount: number;
      label?: string;
      vout: number;
      fee: number;
      abandoned: number;
    }>;
    hex: string;
  }

  interface WalletInfo {
    walletname: string;
    walletversion: number;
    balance: number;
    unconfirmed_balance: number;
    immature_balance: number;
    txcount: number;
    keypoololdest: number;
    keypoolsize: number;
    paytxfee: number;
    hdmasterkeyid: string;
  }

  type scriptPubkeyType = string;

  type SigHashType =
    | 'ALL'
    | 'NONE'
    | 'SINGLE'
    | 'ALL|ANYONECANPAY'
    | 'NONE|ANYONECANPAY'
    | 'SINGLE|ANYONECANPAY';

  interface SignRawTxResult {
    hex: string;
    complete: boolean;
    errors?: Array<{
      txid: string;
      vout: number;
      scriptSig: string;
      sequence: number;
      error: string;
    }>;
  }

  interface ValidateAddressResult {
    isvalid: boolean;
    address?: string;
    scriptPubKey?: string;
    ismine?: boolean;
    iswatchonly?: boolean;
    isscript?: boolean;
    script?: string;
    hex?: string;
    addresses?: string[];
    sigsrequired?: number;
    pubkey?: string;
    iscompressed?: boolean;
    account?: string;
    timestamp?: number;
    hdkeypath?: string;
    hdmasterkeyid?: string;
  }

  interface ImportMultiRequest {
    scriptPubKey: string | { address: string };
    timestamp: number | 'now';
    redeemScript?: string;
    pubkeys?: string[];
    keys?: string[];
    internal?: boolean;
    watchonly?: boolean;
    label?: string;
  }

  interface Received {
    involvesWatchonly?: boolean;
    account: string;
    amount: number;
    confirmations: number;
    label: string;
  }

  interface ListUnspentOptions {
    minimumAmount: number | string;
    maximumAmount: number | string;
    maximumCount: number | string;
    minimumSumAmount: number | string;
  }

  type ReceivedByAccount = Received;

  type ReceivedByAddress = {
    address: string;
    txids: string[];
  } & Received;

  type RestExtension = 'json' | 'bin' | 'hex';

  export type MethodNameInLowerCase =
    | 'getbestblockhash'
    | 'getblock'
    | 'getblockchaininfo'
    | 'getblockcount'
    | 'getblockhash'
    | 'getblockheader'
    | 'getchaintips'
    | 'getchaintxstats'
    | 'getdifficulty'
    | 'getmempoolancestors'
    | 'getmempooldescendants'
    | 'getmempoolentry'
    | 'getmempoolinfo'
    | 'getrawmempool'
    | 'gettxout'
    | 'gettxoutproof'
    | 'gettxoutsetinfo'
    | 'preciousblock'
    | 'pruneblockchain'
    | 'verifychain'
    | 'verifytxoutproof'
    | 'getinfo'
    | 'getmemoryinfo'
    | 'help'
    | 'stop'
    | 'uptime'
    | 'generate'
    | 'generatetoaddress'
    | 'getblocktemplate'
    | 'getmininginfo'
    | 'getnetworkhashps'
    | 'prioritisetransaction'
    | 'submitblock'
    | 'addnode'
    | 'clearbanned'
    | 'disconnectnode'
    | 'getaddednodeinfo'
    | 'getconnectioncount'
    | 'getnettotals'
    | 'getnetworkinfo'
    | 'getpeerinfo'
    | 'istbanned'
    | 'ping'
    | 'setban'
    | 'setnetworkactive'
    | 'combinerawtransaction'
    | 'createrawtransaction'
    | 'decoderawtransaction'
    | 'decodescript'
    | 'fundrawtransaction'
    | 'getrawtransaction'
    | 'sendrawtransaction'
    | 'signrawtransaction'
    | 'createmultisig'
    | 'estimatefee'
    | 'estimatesmartfee'
    | 'signmessagewithprivkey'
    | 'validateaddress'
    | 'verifymessage'
    | 'abandontransaction'
    | 'abortrescan'
    | 'addmultisigaddress'
    | 'addwitnessaddress'
    | 'backupwallet'
    | 'bumpfee'
    | 'dumpprivkey'
    | 'dumpwallet'
    | 'encryptwallet'
    | 'getaccount'
    | 'getaccountaddress'
    | 'getaddressesbyaccount'
    | 'getbalance'
    | 'getnewaddress'
    | 'getrawchangeaddress'
    | 'getreceivedbyaccount'
    | 'getreceivedbyaddress'
    | 'gettransaction'
    | 'getunconfirmedbalance'
    | 'getwalletinfo'
    | 'importaddress'
    | 'importmulti'
    | 'importprivkey'
    | 'importprunedfunds'
    | 'importpubkey'
    | 'importwallet'
    | 'keypoolrefill'
    | 'listaccounts'
    | 'listaddressgroupings'
    | 'listlockunspent'
    | 'listreceivedbyaccount'
    | 'listreceivedbyaddress'
    | 'listsinceblock'
    | 'listtransactions'
    | 'listunspent'
    | 'listwallets'
    | 'lockunspent'
    | 'move'
    | 'removeprunedfunds'
    | 'sendfrom'
    | 'sendmany'
    | 'sendtoaddress'
    | 'setaccount'
    | 'settxfee'
    | 'signmessage';

  interface BatchOption {
    method: MethodNameInLowerCase;
    parameters: any;
  }
  export type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;

  interface BumpFeeOption {
    confTarget?: number;
    totalFee?: number;
    replaceable?: boolean;
    estimate_mode?: FeeEstimateMode;
  }

  interface WalletTxBase {
    account: string;
    address: string;
    category: 'send' | 'receive';
    amount: number;
    vout: number;
    fee: number;
    confirmations: number;
    blockhash: string;
    blockindex: number;
    blocktime: number;
    txid: string;
    time: number;
    timereceived: number;
    walletconflicts: string[];
    'bip125-replaceable': 'yes' | 'no' | 'unknown';
    abandoned?: boolean;
    comment?: string;
    label: string;
    to?: string;
  }

  type TransactionInListSinceBlock = WalletTxBase;

  interface ListSinceBlockResult {
    transactions: TransactionInListSinceBlock[];
    removed?: TransactionInListSinceBlock[];
    lastblock: string;
  }

  type ListTransactionsResult = {
    trusted: boolean;
    otheraccount?: string;
    abandoned?: boolean;
  } & WalletTxBase;

  type AddressGrouping = [string, number] | [string, number, string];

  export default class Client {
    private readonly request: any;
    private readonly requests: Requester;
    private readonly parser: Parser;

    constructor(clientOption?: ClientConstructorOption);

    public abandonTransaction(txid: string): Promise<void>;

    public abortRescan(): Promise<void>;

    public addMultiSigAddress(
      nrequired: number,
      keys: string[],
      account?: string,
    ): Promise<string>;

    public addNode(
      node: string,
      command: 'add' | 'remove' | 'onentry',
    ): Promise<void>;

    public addWitnessAddress(address: string): Promise<void>;

    public backupWallet(destination: string): Promise<void>;

    public bumpFee(
      txid: string,
      options?: BumpFeeOption,
    ): Promise<{
      txid: string;
      origfee: number;
      fee: number;
      error?: string[];
    }>;

    public clearBanned(): Promise<void>;

    public combineRawTransaction(txs: string[]): Promise<string>;

    public command<R extends ReturnType<keyof Client>>(
      methods: BatchOption[],
    ): Promise<ReadonlyArray<R>>;

    public createMultiSig(
      nrequired: number,
      keys: string[],
    ): Promise<{ address: string; redeemScript: string }>;

    public createRawTransaction(
      inputs: TxInForCreateRaw[],
      outputs: TxOutForCreateRaw,
      locktime: number,
      replacable: boolean,
    ): Promise<string>;

    /**
     * @deprecated
     */
    public createWitnessAddress(...args: any[]): void;

    public decodeRawTransaction(
      hexstring: string,
    ): Promise<DecodedRawTransaction>;

    public decodeScript(hexstring: string): Promise<ScriptDecoded>;

    public disconnectNode(address?: string, nodeid?: number): Promise<void>;

    public dumpPrivKey(address: string): Promise<string>;

    public dumpWallet(filename: string): Promise<{ filename: string }>;

    public encryptWallet(passphrase: string): Promise<void>;

    public estimateFee(nblock: number): Promise<number>;

    /**
     * @deprecated
     */
    public estimatePriority(...args: any[]): void;

    public estimateSmartFee(
      confTarget: number,
      estimateMode?: FeeEstimateMode,
    ): Promise<{ feerate?: number; errors?: string[]; blocks?: number }>;

    /**
     * @deprecated
     */
    public estimateSmartPriority(...args: any[]): void;

    public fundRawTransaction(
      hexstring: string,
      options: FundRawTxOptions,
    ): Promise<{ hex: string; fee: number; changepos: number }>;

    public generate(nblocks: number, maxtries?: number): Promise<string[]>;

    public generateToAddress(
      nblock: number,
      address: string,
      maxtries?: number,
    ): Promise<string[]>;

    /**
     * @deprecated
     * @param {string} address
     * @returns {Promise<string>}
     */
    public getAccount(address: string): Promise<string>;

    /**
     * @deprecated
     * @param {string} account
     * @returns {Promise<string>}
     */
    public getAccountAddress(account: string): Promise<string>;

    public getAddedNodeInfo(node?: string): Promise<AddedNodeInfo[]>;

    /**
     * @deprecated
     * @param {string} account
     * @returns {Promise<string[]>}
     */
    public getAddressesByAccount(account: string): Promise<string[]>;

    public getBalance(
      account?: string,
      minconf?: number,
      includeWatchonly?: boolean,
    ): Promise<number>;

    public getBestBlockHash(): Promise<string>;

    public getBlock(
      blockhash: string,
      verbosity?: number,
    ): Promise<string | Block>;

    public getBlockByHash(
      hash: string,
      extension: RestExtension,
    ): Promise<Block>;

    public getBlockCount(): Promise<number>;

    public getBlockHash(height: number): Promise<string>;

    public getBlockHeader(
      hash: string,
      verbose?: boolean,
    ): Promise<string | BlockHeader>;

    public getBlockHeadersByHash(
      hash: string,
      extension: RestExtension,
    ): Promise<BlockHeader[]>;

    public getBlockTemplate(...args: any[]): void;

    public getBlockchainInfo(): Promise<ChainInfo>;

    public getBlockchainInformation(): Promise<ChainInfo>;

    public getChainTips(): Promise<ChainTip[]>;

    public getChainTxStats(
      nblocks?: number,
      blockchash?: string,
    ): Promise<TxStats>;

    public getConnectionCount(): Promise<number>;

    public getDifficulty(): Promise<number>;

    /**
     * @deprecated
     */
    public getGenerate(...args: any[]): void;

    /**
     * @deprecated
     */
    public getHashesPerSec(...args: any[]): void;

    /**
     * @deprecated
     */
    public getInfo(...args: any[]): void;

    public getMemoryInfo(
      mode?: 'stats' | 'mallocinfo',
    ): Promise<MemoryStats | string>;

    public getMemoryPoolContent(): Promise<MempoolContent>;

    public getMemoryPoolInformation(): Promise<MempoolInfo>;

    public getMempoolAncestors(
      txid: string,
      verbose?: boolean,
    ): Promise<MempoolContent[] | string[] | null[]>;

    public getMempoolDescendants(
      txid: string,
      verbose?: boolean,
    ): Promise<MempoolContent[] | string[] | null[]>;

    public getMempoolEntry(txid: string): Promise<MempoolContent>;

    public getMempoolInfo(): Promise<MempoolInfo>;

    public getMiningInfo(): Promise<MiningInfo>;

    public getNetTotals(): Promise<NetTotals>;

    public getNetworkHashPs(nblocks?: number, height?: number): Promise<number>;

    public getNetworkInfo(): Promise<NetworkInfo>;

    public getNewAddress(account?: string): Promise<string>;

    public getPeerInfo(): Promise<PeerInfo[]>;

    public getRawChangeAddress(): Promise<string>;

    public getRawMempool(
      verbose?: boolean,
    ): Promise<MempoolContent[] | string[] | null[]>;

    public getRawTransaction(
      txid: string,
      verbose?: boolean,
    ): Promise<FetchedRawTransaction | string>;

    /**
     * @deprecated
     * @param {string} account
     * @param {number} minconf
     * @returns {Promise<number>}
     */
    public getReceivedByAccount(
      account: string,
      minconf?: number,
    ): Promise<number>;

    public getReceivedByAddress(
      address: string,
      minconf?: number,
    ): Promise<number>;

    public getTransaction(
      txid: string,
      includeWatchonly?: boolean,
    ): Promise<WalletTransaction>;

    public getTransactionByHash(
      hash: string,
      extension?: RestExtension,
    ): Promise<string>;

    public getTxOut(
      txid: string,
      index: number,
      includeMempool?: boolean,
    ): Promise<TxOutInBlock>;

    public getTxOutProof(txids: string[], blockchash?: string): Promise<string>;

    public getTxOutSetInfo(): Promise<UTXOStats>;

    public getUnconfirmedBalance(): Promise<number>;

    public getUnspentTransactionOutputs(
      outpoints: Outpoint[],
    ): Promise<{
      chainHeight: number;
      chaintipHash: string;
      bipmap: string;
      utxos: UTXO[];
    }>;

    public getWalletInfo(): Promise<WalletInfo>;

    /**
     * @deprecated
     */
    public getWork(...args: any[]): void;

    public help(arg: void | MethodNameInLowerCase): Promise<string>;

    public importAddress(
      script: string,
      label?: string,
      rescan?: boolean,
      p2sh?: boolean,
    ): Promise<void>;

    public importMulti(
      requests: ImportMultiRequest[],
      options?: { rescan?: boolean },
    ): Promise<
      Array<{ success: boolean; error?: { code: string; message: string } }>
    >;

    public importPrivKey(
      bitcoinprivkey: string,
      label?: string,
      rescan?: boolean,
    ): Promise<void>;

    public importPrunedFunds(
      rawtransaction: string,
      txoutproof: string,
    ): Promise<void>;

    public importPubKey(
      pubkey: string,
      label?: string,
      rescan?: boolean,
    ): Promise<void>;

    public importWallet(filename: string): Promise<void>;

    public keypoolRefill(newsize?: number): Promise<void>;

    public listAccounts(
      minconf?: number,
      includeWatchonlly?: boolean,
    ): Promise<{ [key: string]: number }>;

    public listAddressGroupings(): Promise<AddressGrouping[][]>;

    public listBanned(): Promise<any>;

    public listLockUnspent(): Promise<Array<{ txid: string; vout: number }>>;

    public listReceivedByAccount(
      minconf?: number,
      includeEmpty?: boolean,
      includeWatchonly?: boolean,
    ): Promise<ReceivedByAccount[]>;

    public listReceivedByAddress(
      minconf?: number,
      includeEmpty?: boolean,
      includeWatchonly?: boolean,
    ): Promise<ReceivedByAddress[]>;

    public listSinceBlock(
      blockhash?: string,
      targetConfirmations?: number,
      includeWatchonly?: boolean,
      includeRemoved?: boolean,
    ): Promise<ListSinceBlockResult>;

    public listTransactions(
      account?: string,
      count?: number,
      skip?: number,
      includeWatchonly?: boolean,
    ): Promise<ListTransactionsResult[]>;

    public listUnspent(
      minconf?: number,
      maxconf?: number,
      address?: string[],
      includeUnsafe?: boolean,
      queryOptions?: ListUnspentOptions,
    ): Promise<UnspentTxInfo[]>;

    public listWallets(): Promise<string[]>;

    public lockUnspent(
      unlock: boolean,
      transactions?: Array<{ txid: string; vout: number }>,
    ): Promise<boolean>;

    /**
     * @deprecated
     * @param {string} fromaccout
     * @param {string} toaccount
     * @param {number} amount
     * @param {number} dummy
     * @param {string} comment
     * @returns {Promise<boolean>}
     */
    public move(
      fromaccout: string,
      toaccount: string,
      amount: number,
      dummy?: number,
      comment?: string,
    ): Promise<boolean>;

    public ping(): Promise<void>;

    public preciousBlock(blockhash: string): Promise<void>;

    public prioritiseTransaction(
      txid: string,
      dummy: 0,
      feeDelta: number,
    ): Promise<boolean>;

    public pruneBlockchain(height: number): Promise<number>;

    public removePrunedFunds(txid: string): Promise<void>;

    /**
     * @deprecated
     * @param {string} fromaccount
     * @param {string} toaddress
     * @param {number | string} amount
     * @param {number} minconf
     * @param {string} comment
     * @param {string} commentTo
     * @returns {Promise<string>}
     */
    public sendFrom(
      fromaccount: string,
      toaddress: string,
      amount: number | string,
      minconf?: number,
      comment?: string,
      commentTo?: string,
    ): Promise<string>;

    public sendMany(
      fromaccount: string,
      amounts: { [address: string]: string },
      minconf?: number,
      comment?: string,
      subtractfeefrom?: string[],
      replaeable?: boolean,
      confTarget?: number,
      estimateMode?: FeeEstimateMode,
    ): Promise<string>;

    public sendRawTransaction(
      hexstring: string,
      allowhighfees?: boolean,
    ): Promise<void>;

    public sendToAddress(
      address: string,
      amount: number,
      comment?: string,
      commentTo?: string,
      subtreactfeefromamount?: boolean,
      replaceable?: boolean,
      confTarget?: number,
      estimateMode?: FeeEstimateMode,
    ): Promise<string>;

    /**
     * @deprecated
     * @param {string} address
     * @param {string} account
     * @returns {Promise<void>}
     */
    public setAccount(address: string, account: string): Promise<void>;

    public setBan(
      subnet: string,
      command: 'add' | 'remove',
      bantime?: number,
      absolute?: boolean,
    ): Promise<void>;

    /**
     * @deprecated
     * @param args
     */
    public setGenerate(...args: any[]): void;

    public setNetworkActive(state: boolean): Promise<void>;

    public setTxFee(amount: number | string): Promise<boolean>;

    public signMessage(address: string, message: string): Promise<string>;

    public signMessageWithPrivKey(
      privkey: string,
      message: string,
    ): Promise<{ signature: string }>;

    public signRawTransaction(
      hexstring: string,
      prevtxs?: PrevOut[],
      privkeys?: string[],
      sighashtype?: SigHashType,
    ): Promise<SignRawTxResult>;

    public stop(): Promise<void>;

    public submitBlock(hexdata: string, dummy?: any): Promise<void>;

    public upTime(): Promise<number>;

    public validateAddress(address: string): Promise<ValidateAddressResult>;

    public verifyChain(checklevel?: number, nblocks?: number): Promise<boolean>;

    public verifyMessage(
      address: string,
      signature: string,
      message: string,
    ): Promise<boolean>;

    public verifyTxOutProof(proof: string): Promise<string[]>;

    public walletLock(passphrase: string, timeout: number): Promise<void>;

    public walletPassphrase(passphrase: string, timeout: number): Promise<void>;

    public walletPassphraseChange(
      oldpassphrase: string,
      newpassphrase: string,
    ): Promise<string>;
  }
}
