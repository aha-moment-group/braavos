import { Injectable } from '@nestjs/common';
import bunyan from 'bunyan';
import { Cron, NestSchedule } from 'nest-schedule';
import { getManager } from 'typeorm';
import Web3 from 'web3';
import Contract from 'web3/eth/contract';
import { ChainEnum } from '../chains';
import { CoinEnum } from '../coins';
import { ConfigService } from '../config/config.service';
import { DepositStatus } from '../entities/deposit-status.enum';
import { Deposit } from '../entities/deposit.entity';

const { ethereum } = ChainEnum;

@Injectable()
export abstract class Erc20Collect extends NestSchedule {
  private readonly config: ConfigService;
  private readonly logger: bunyan;
  private readonly web3: Web3;
  private readonly abi: any;
  private readonly coinSymbol: CoinEnum;
  private readonly cronLock: any;
  private readonly tokenService: any;

  constructor(
    config: ConfigService,
    logger: bunyan,
    web3: Web3,
    coinSymbol: CoinEnum,
    tokenService: any,
  ) {
    super();
    this.config = config;
    this.logger = logger;
    this.web3 = web3;
    this.coinSymbol = coinSymbol;
    this.cronLock = {
      collectCron: false,
    };
    this.tokenService = tokenService;
    this.abi = tokenService.abi;
  }

  @Cron('*/2 * * * *')
  public async cron(): Promise<void> {
    if (this.cronLock.collectCron === true) {
      return;
    }
    try {
      this.cronLock.collectCron = true;
      const contractAddr = this.config.ethereum.get(this.coinSymbol)
        .contractAddr;
      const decimals = this.config.ethereum.get(this.coinSymbol).collect
        .decimals;
      const contract = new this.web3.eth.Contract(this.abi, contractAddr);
      /* query & update confirmed transactions */
      const confTx = await Deposit.createQueryBuilder()
        .select()
        .where({ coinSymbol: this.coinSymbol, status: DepositStatus.confirmed })
        .getMany();
      if (confTx.length <= 0) {
        this.cronLock.collectCron = false;
        return;
      }
      await Promise.all(
        confTx.map(async (tx) => {
          if (!tx.info.collectHash) {
            return;
          }
          const thisAddr = await this.tokenService.getAddr(
            tx.clientId,
            tx.addrPath,
          );
          const fullNodeNonce = await this.web3.eth.getTransactionCount(
            thisAddr,
          );
          /* nonce is always eth nonce */
          const dbNonce: any = await this.getDbNonce(tx);
          /* compare nonce db - fullNode */
          if (dbNonce < fullNodeNonce) {
            this.logger.fatal(
              `db nonce is less than full node nonce db info: ${tx}`,
            );
            return;
          } else if (dbNonce > fullNodeNonce) {
            this.logger.info(
              `still have some txs to be handled | ${this.coinSymbol}`,
            );
            return;
          } else {
            /* dbNonce === fullNodeNoce, broadcast transaction */
            await this.handleTx(tx, thisAddr, contract, decimals, dbNonce);
          }
        }),
      );
      this.logger.debug(`finish ${this.coinSymbol} collect`);
      this.cronLock.collectCron = false;
      return;
    } catch (err) {
      this.logger.error(err);
      this.cronLock.collectCron = false;
    }
  }

  private async handleTx(
    tx: Deposit,
    thisAddr: string,
    contract: Contract,
    decimals: number,
    dbNonce: any,
  ): Promise<void> {
    /* judge whether collect value has been sent to account */
    const collectHash = tx.info.collectHash;
    if (!collectHash) {
      this.logger.debug(`Don't have collect hash | ${this.coinSymbol}`);
      return;
    }
    const collectBalance = this.web3.utils.toBN(
      await this.web3.eth.getBalance(thisAddr),
    );
    const checkCollect = await this.web3.eth.getTransaction(collectHash);
    if (!checkCollect.blockNumber) {
      return;
    }

    const balance = await contract.methods.balanceOf(thisAddr).call();
    const prv = this.tokenService.getPrivateKey(tx.clientId, tx.addrPath);

    const stringAmount = tx.amount.split('.');
    const preAmount = this.web3.utils.toBN(stringAmount[0] + stringAmount[1]);

    let collectValue: string;
    /* check whether real erc20 balance is more than db record */
    if (decimals <= 8) {
      collectValue = preAmount
        .div(this.web3.utils.toBN(Math.pow(10, 8 - decimals)))
        .toString();
    } else {
      collectValue = preAmount
        .mul(this.web3.utils.toBN(Math.pow(10, decimals - 8)))
        .toString();
    }
    if (this.web3.utils.toBN(balance).lt(this.web3.utils.toBN(collectValue))) {
      this.logger.error(
        `erc20 balance is less than than db record | address: ${thisAddr}`,
      );
      return;
    }
    const collectAddr = await this.tokenService.getAddr(0, '0');
    const method = contract.methods.transfer(collectAddr, collectValue);
    let txData;
    try {
      txData = method.encodeABI();
      await method.estimateGas({ from: thisAddr });
    } catch (error) {
      this.logger.error(error);
      return;
    }
    const gasLimit = tx.info.gasLimit;
    const thisGasPrice = tx.info.gasPrice;
    const gasFee = this.web3.utils
      .toBN(gasLimit)
      .mul(this.web3.utils.toBN(thisGasPrice));
    if (collectBalance.lt(gasFee)) {
      this.logger.error(`wallet balance is not enough | ${this.coinSymbol}`);
      return;
    }
    const signTx = await this.web3.eth.accounts.signTransaction(
      {
        data: txData,
        gas: gasLimit,
        gasPrice: thisGasPrice.toString(),
        nonce: dbNonce,
        to: contract.options.address,
      },
      prv,
    );
    try {
      await this.web3.eth
        .sendSignedTransaction(signTx.rawTransaction)
        .on('transactionHash', async (hash) => {
          this.logger.debug(`collect ${this.coinSymbol} hash: ${hash}`);
          await Deposit.createQueryBuilder()
            .update()
            .set({ status: DepositStatus.finished })
            .where({ id: tx.id })
            .execute();
        });
    } catch (err) {
      this.logger.error(err);
    }
  }

  private async getDbNonce(tx: Deposit): Promise<any> {
    let dbNonce;
    if (tx.info.nonce === undefined || tx.info.nonce === null) {
      await getManager().transaction(async (manager) => {
        await manager.query(`
          select * from addr
          where chain = '${ethereum}'
          and "clientId" = ${tx.clientId} and path = '${tx.addrPath}'
          for update
        `);
        const uu = await manager.query(`
          update addr
          set info = (info || ('{"nonce":' || ((info->>'nonce')::int + 1) || '}')::jsonb)
          where chain = '${ethereum}'
          and "clientId" = ${tx.clientId} and path = '${tx.addrPath}'
          returning info->'nonce' as nonce
        `);
        dbNonce = uu[0].nonce;
        dbNonce = dbNonce - 1;
        await manager.query(`
          update deposit
          set info = (info || ('{"nonce":' || (${dbNonce}) || '}')::jsonb)
          where id = ${tx.id}
        `);
      });
    } else {
      dbNonce = tx.info.nonce;
    }
    return dbNonce;
  }
}
