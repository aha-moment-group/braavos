import { Injectable } from '@nestjs/common';
import bunyan from 'bunyan';
import crypto from 'crypto';
import { Cron, NestSchedule } from 'nest-schedule';
import querystring from 'querystring';
import request from 'superagent';
import { getManager } from 'typeorm';
import Web3 from 'web3';
import { TxSignature } from 'web3/eth/accounts';
import Contract from 'web3/eth/contract';
import { AmqpService } from '../amqp/amqp.service';
import { CoinEnum } from '../coins';
import { ConfigService } from '../config/config.service';
import { WithdrawalStatus } from '../entities/withdrawal-status.enum';
import { Withdrawal } from '../entities/withdrawal.entity';

const { ETH } = CoinEnum;

@Injectable()
export abstract class Erc20Withdrawal extends NestSchedule {
  private readonly config: ConfigService;
  private readonly logger: bunyan;
  private readonly amqpService: AmqpService;
  private readonly web3: Web3;
  private readonly abi: any;
  private readonly coinSymbol: CoinEnum;
  private readonly cronLock: any;
  private readonly tokenService: any;
  private readonly bmartHost: string;
  private readonly bmartKey: string;
  private readonly bmartSecret: string;

  constructor(
    config: ConfigService,
    logger: bunyan,
    amqpService: AmqpService,
    web3: Web3,
    coinSymbol: CoinEnum,
    tokenService: any,
  ) {
    super();
    this.config = config;
    this.logger = logger;
    this.amqpService = amqpService;
    this.web3 = web3;
    this.coinSymbol = coinSymbol;
    this.cronLock = {
      withdrawalCron: false,
    };
    this.tokenService = tokenService;
    this.abi = tokenService.abi;
    this.bmartHost = this.config.ethereum.bmartHost;
    this.bmartKey = this.config.ethereum.bmartKey;
    this.bmartSecret = this.config.ethereum.bmartSecret;
  }

  @Cron('*/10 * * * * *')
  public async cron(): Promise<void> {
    if (this.cronLock.withdrawalCron === true) {
      return;
    }
    try {
      this.cronLock.withdrawalCron = true;
      const contractAddr = this.config.ethereum.get(this.coinSymbol)
        .contractAddr;
      const decimals = this.config.ethereum.get(this.coinSymbol).deposit
        .decimals;
      const contract = new this.web3.eth.Contract(this.abi, contractAddr);
      const collectAddr = await this.tokenService.getAddr(0, '0');
      const prv = this.tokenService.getPrivateKey(0, '0');

      while (true) {
        let wd;
        /* handle normal withdrawl */
        wd = await Withdrawal.createQueryBuilder()
          .where({
            coinSymbol: this.coinSymbol,
            status: WithdrawalStatus.created,
            txHash: null,
          })
          .orderBy(`info->'nonce'`)
          .getMany();
        if (wd.length <= 0) {
          this.logger.debug(`no record | ${this.coinSymbol}`);
          this.cronLock.withdrawalCron = false;
          break;
        }
        for (const v of wd) {
          if (v.memo) {
            v.memo = v.memo.toLowerCase();
            if (v.memo === 'bmart') {
              continue;
            }
          }
          const dbNonce: any = await this.getDbNonce(v);
          const fullNodeNonce = await this.web3.eth.getTransactionCount(
            collectAddr,
          );

          /* compare nonce db - fullNode */
          if (dbNonce < fullNodeNonce) {
            this.logger.error(
              `db nonce less than full node none | ${this.coinSymbol}`,
            );
            this.cronLock.withdrawalCron = false;
            return;
          } else if (dbNonce > fullNodeNonce) {
            this.logger.info('still have some txs to be handled');
            continue;
          } else {
            /* dbNonce === fullNodeNonce, broadcast transaction */
            await this.handleTx(
              v,
              decimals,
              collectAddr,
              contract,
              prv,
              dbNonce,
              contractAddr,
            );
          }
        }
      }
      this.cronLock.withdrawalCron = false;
      return;
    } catch (err) {
      this.logger.error(err);
      this.cronLock.withdrawalCron = false;
    }
  }

  private async handleTx(
    v: Withdrawal,
    decimals: number,
    collectAddr: any,
    contract: Contract,
    prv: string,
    dbNonce: any,
    contractAddr: string,
  ): Promise<void> {
    const stringAmount = v.amount.split('.');
    if (!stringAmount[1]) {
      stringAmount[1] = '0';
    }
    if (stringAmount[1].length < 8) {
      const dis = 8 - stringAmount[1].length;
      for (let i = 0; i < dis; i++) {
        stringAmount[1] += '0';
      }
    }
    const preAmount = this.web3.utils.toBN(stringAmount[0] + stringAmount[1]);
    let amount: string;
    if (decimals <= 8) {
      amount = preAmount
        .div(this.web3.utils.toBN(Math.pow(10, 8 - decimals)))
        .toString();
    } else {
      amount = preAmount
        .mul(this.web3.utils.toBN(Math.pow(10, decimals - 8)))
        .toString();
    }
    const method = contract.methods.transfer(v.recipient, amount);
    let txData;
    let gasLimit;
    try {
      txData = method.encodeABI();
      gasLimit = await method.estimateGas({ from: collectAddr });
    } catch (err) {
      this.logger.error(err);
      this.cronLock.withdrawalCron = false;
      return;
    }
    const realGasPrice = await this.web3.eth.getGasPrice();
    const thisGasPrice = this.web3.utils
      .toBN(realGasPrice)
      .add(this.web3.utils.toBN(30000000000))
      .toString();
    /* Judge if collect wallet eth balance is suffient to pay the fee */
    const gasFee = this.web3.utils
      .toBN(gasLimit)
      .mul(this.web3.utils.toBN(thisGasPrice));
    const collectBalance = this.web3.utils.toBN(
      await this.web3.eth.getBalance(collectAddr),
    );
    if (collectBalance.lt(gasFee)) {
      this.logger.error('Collect wallet eth balance is not enough');
      this.cronLock.withdrawalCron = false;
      return;
    }
    /* Judge if collect wallet has enough erc20 token */
    const ercBalance = await contract.methods.balanceOf(collectAddr).call();
    if (this.web3.utils.toBN(ercBalance).lt(this.web3.utils.toBN(amount))) {
      this.logger.error(`erc20 balance is less than db record`);
      this.cronLock.withdrawalCron = false;
      return;
    }
    /* start erc20 withdraw */
    const signTx = await this.web3.eth.accounts.signTransaction(
      {
        data: txData,
        gas: gasLimit,
        gasPrice: thisGasPrice,
        nonce: dbNonce,
        to: contract.options.address,
      },
      prv,
    );
    await this.broadcastTx(signTx, v, contractAddr, collectAddr);
  }

  private async getDbNonce(v: Withdrawal): Promise<any> {
    let dbNonce: any;
    if (v.info.nonce === null || v.info.nonce === undefined) {
      await getManager().transaction(async (manager) => {
        await manager.query(`
          select * from kv_pair
          where key = 'ethWithdrawalNonce'
          for update
        `);
        const uu = await manager.query(`
          update kv_pair
          set value = to_json(value::text::integer + 1)
          where key = 'ethWithdrawalNonce'
          returning value as nonce
        `);
        dbNonce = uu[0].nonce;
        dbNonce = dbNonce - 1;
        await manager.query(`
          update withdrawal
          set info = (info || ('{"nonce":' || (${dbNonce}) || '}')::jsonb)
          where id = ${v.id}
        `);
      });
    } else {
      dbNonce = v.info.nonce;
    }
    return dbNonce;
  }

  private async broadcastTx(
    signTx: TxSignature,
    v: Withdrawal,
    contractAddr: string,
    collectAddr: any,
  ): Promise<void> {
    try {
      const tx = await this.web3.eth
        .sendSignedTransaction(signTx.rawTransaction)
        .on('transactionHash', async (hash) => {
          this.logger.info(`withdrawTxHash ${this.coinSymbol}: ${hash}`);
          await Withdrawal.createQueryBuilder()
            .update()
            .set({
              feeAmount: 0,
              feeSymbol: ETH,
              status: WithdrawalStatus.finished,
              txHash: hash,
            })
            .where({ id: v.id })
            .execute();
          const ww = await Withdrawal.findOne({ id: v.id });
          if (ww) {
            this.amqpService.updateWithdrawal(ww);
          }
          this.logger.info('Finish update db | tokenName: ' + this.coinSymbol);
          if (v.memo) {
            v.memo = v.memo.toLowerCase();
          }
        });
    } catch (err) {
      this.logger.error(err);
    }
  }
}
