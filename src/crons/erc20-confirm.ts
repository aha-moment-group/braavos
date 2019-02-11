import { Injectable } from '@nestjs/common';
import bunyan from 'bunyan';
import { Cron, NestSchedule } from 'nest-schedule';
import { getManager } from 'typeorm';
import Web3 from 'web3';
import { AmqpService } from '../amqp/amqp.service';
import { CoinEnum } from '../coins';
import { ConfigService } from '../config/config.service';
import { Account } from '../entities/account.entity';
import { DepositStatus } from '../entities/deposit-status.enum';
import { Deposit } from '../entities/deposit.entity';

@Injectable()
export abstract class Erc20Confirm extends NestSchedule {
  private readonly config: ConfigService;
  private readonly logger: bunyan;
  private readonly web3: Web3;
  private readonly amqpService: AmqpService;
  private readonly abi: any;
  private readonly coinSymbol: CoinEnum;
  private readonly cronLock: any;
  private readonly tokenService: any;

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
    this.web3 = web3;
    this.amqpService = amqpService;
    this.coinSymbol = coinSymbol;
    this.cronLock = {
      confirmCron: false,
      payPreFeeCron: false,
    };
    this.tokenService = tokenService;
    this.abi = tokenService.abi;
  }

  @Cron('*/30 * * * * *')
  public async confirmCron(): Promise<void> {
    if (this.cronLock.confirmCron === true) {
      return;
    }
    try {
      this.cronLock.confirmCron = true;
      const confThreshold = this.config.ethereum.get(this.coinSymbol).collect
        .confThreshold;
      const uu = await Deposit.createQueryBuilder()
        .select()
        .where({
          coinSymbol: this.coinSymbol,
          status: DepositStatus.unconfirmed,
        })
        .getMany();
      if (uu.length <= 0) {
        this.cronLock.confirmCron = false;
        return;
      }
      const height = await this.web3.eth.getBlockNumber();
      await Promise.all(
        uu.map(async (tx: Deposit) => {
          const blockHeight = tx.info.blockHeight;
          if (height - blockHeight < confThreshold) {
            return;
          }
          await getManager().transaction(async (manager) => {
            await manager
              .createQueryBuilder()
              .update(Deposit)
              .set({ status: DepositStatus.confirmed })
              .where({ id: tx.id })
              .execute();
            await manager
              .createQueryBuilder()
              .insert()
              .into(Account)
              .values({ clientId: tx.clientId, coinSymbol: this.coinSymbol })
              .onConflict('("clientId", "coinSymbol") DO NOTHING')
              .execute();
            await manager
              .createQueryBuilder(Account, 'account')
              .where({ clientId: tx.clientId, coinSymbol: this.coinSymbol })
              .setLock('pessimistic_write')
              .getOne();
            await manager.increment(
              Account,
              { clientId: tx.clientId, coinSymbol: this.coinSymbol },
              'balance',
              Number(tx.amount),
            );
            this.logger.debug('erc20 confirm: ' + tx.id);
          });
          const dd = await Deposit.findOne({ id: tx.id });
          if (dd) {
            try {
              if (dd.status === DepositStatus.confirmed) {
                await this.amqpService.updateDeposit(dd);
              }
            } catch (err) {
              this.logger.error(err);
            }
          }
        }),
      );
      this.cronLock.confirmCron = false;
      return;
    } catch (err) {
      this.cronLock.confirmCron = false;
    }
  }

  @Cron('*/59 * * * * *')
  public async payPreFee(): Promise<void> {
    if (this.cronLock.payPreFeeCron === true) {
      return;
    }
    try {
      this.cronLock.payPreFeeCron = true;
      const contractAddr = this.config.ethereum.get(this.coinSymbol)
        .contractAddr;
      const pocketAddr = this.config.ethereum.pocketAddr;
      const pocketPrv = this.config.ethereum.pocketPrv;
      const decimals = this.config.ethereum.get(this.coinSymbol).collect
        .decimals;
      const uu = await Deposit.createQueryBuilder()
        .select()
        .where({ coinSymbol: this.coinSymbol, status: DepositStatus.confirmed })
        .getMany();
      if (uu.length <= 0) {
        this.cronLock.payPreFeeCron = false;
        return;
      }
      const contract = new this.web3.eth.Contract(this.abi, contractAddr);
      const collectAddr = await this.tokenService.getAddr(0, '0');
      for (const tx of uu) {
        if (tx.info.collectHash) {
          continue;
        }
        const thisAddr = await this.tokenService.getAddr(
          tx.clientId,
          tx.addrPath,
        );
        const stringAmount = tx.amount.split('.');
        const preAmount = this.web3.utils.toBN(
          stringAmount[0] + stringAmount[1],
        );

        let collectValue: string;
        // check whether real erc20 balance is more than db record
        if (decimals <= 8) {
          collectValue = preAmount
            .div(this.web3.utils.toBN(Math.pow(10, 8 - decimals)))
            .toString();
        } else {
          collectValue = preAmount
            .mul(this.web3.utils.toBN(Math.pow(10, decimals - 8)))
            .toString();
        }
        const method = contract.methods.transfer(collectAddr, collectValue);
        let txData: string;
        let gasLimit: number;
        try {
          txData = method.encodeABI();
          gasLimit = await method.estimateGas({ from: thisAddr });
        } catch (err) {
          this.logger.error(err);
          continue;
        }
        const realGasPrice = await this.web3.eth.getGasPrice();
        const thisGasPrice = this.web3.utils
          .toBN(realGasPrice)
          .add(this.web3.utils.toBN(10000000000));

        /* check if balance of pocket address is enough to pay this fee */
        const gasFee = this.web3.utils
          .toBN(gasLimit)
          .mul(this.web3.utils.toBN(thisGasPrice));
        const pocketBalance = this.web3.utils.toBN(
          await this.web3.eth.getBalance(pocketAddr),
        );
        if (pocketBalance.lt(gasFee)) {
          this.logger.error('pocket wallet balance is not enough');
          this.cronLock.payPreFeeCron = false;
          return;
        }

        /* send ether to address to pay erc20 transfer fee */
        const prePayGasPrice = this.web3.utils
          .toBN(realGasPrice)
          .add(this.web3.utils.toBN(10000000000));
        const etherSignTx = await this.web3.eth.accounts.signTransaction(
          {
            gas: 21000,
            gasPrice: prePayGasPrice.toString(),
            to: thisAddr,
            value: gasFee.toString(),
          },
          pocketPrv,
        );

        try {
          await this.web3.eth
            .sendSignedTransaction(etherSignTx.rawTransaction)
            .on('transactionHash', async (hash) => {
              this.logger.debug(`payPreFee ${this.coinSymbol} hash: ${hash}`);
              tx.info.gasLimit = gasLimit;
              tx.info.gasPrice = thisGasPrice.toString();
              tx.info.collectHash = hash;
              await tx.save();
            });
        } catch (err) {
          this.logger.error(err);
        }
      }
      this.cronLock.payPreFeeCron = false;
      this.logger.debug('finish pay pre fee');
      return;
    } catch (err) {
      this.logger.error(err);
      this.cronLock.payPreFeeCron = false;
    }
  }
}
