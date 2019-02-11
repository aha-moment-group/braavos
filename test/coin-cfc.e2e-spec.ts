import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfirmChannel, connect, Connection } from 'amqplib';
import fs from 'fs';
import 'jest';
import yaml from 'js-yaml';
import * as schedule from 'nest-schedule';
import path from 'path';
import signature from 'superagent-http-signature';
import request from 'supertest';
import Web3 from 'web3';
import Contract from 'web3/eth/contract';
import { ConfigService } from '../src/config/config.service';
import { CfcCollect } from '../src/crons/cfc-collect';
import { CfcConfirm } from '../src/crons/cfc-confirm';
import { CfcDeposit } from '../src/crons/cfc-deposit';
import { CfcWithdrawal } from '../src/crons/cfc-withdrawal';
import { CronModule } from '../src/crons/cron.module';
import { HttpModule } from '../src/http/http.module';

const transfer = async (
  web3: Web3,
  prv: string,
  to: string,
  value: string,
): Promise<string> => {
  const signTx = await web3.eth.accounts.signTransaction(
    {
      gas: 21000,
      to,
      value,
    },
    prv,
  );
  const tx = await web3.eth.sendSignedTransaction(signTx.rawTransaction);
  return tx.transactionHash;
};

const transferToken = async (
  web3: Web3,
  contract: Contract,
  from: string,
  to: string,
  value: string,
): Promise<string> => {
  try {
    const method = contract.methods.transfer(to, value);
    const txData = method.encodeABI();
    const gasLimit = await method.estimateGas({ from });
    await web3.eth.personal.unlockAccount(from, 'aha', 600);
    const tx = await web3.eth.sendTransaction({
      data: txData,
      from,
      gas: gasLimit,
      to: contract.options.address,
    });
    return tx.transactionHash;
  } catch (err) {
    throw err;
  }
};

describe('CFC (e2e)', () => {
  let app: INestApplication;
  let amqpConnection: Connection;
  let amqpChannel: ConfirmChannel;
  let web3: Web3;
  let contract: Contract;
  let ownerAddr: string;
  const signer = signature({
    algorithm: 'rsa-sha256',
    headers: ['(request-target)', 'date', 'content-md5'],
    key: fs.readFileSync(__dirname + '/fixtures/private.pem', 'ascii'),
    keyId: '/test/keys/1a:2b',
  });

  beforeAll(async () => {
    schedule.defaults.enable = false;
    // prepare Web3
    web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_RPC!));
    // prepare contract
    const abi: any = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname + '/fixtures/cfc-contract-abi.json'),
        'ascii',
      ),
    );
    const bytecode: any = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname + '/fixtures/cfc-contract-bytecode.json'),
        'ascii',
      ),
    );
    contract = await new web3.eth.Contract(abi);
    const gas = await contract
      .deploy({
        arguments: [],
        data: bytecode.v,
      })
      .estimateGas();
    const addr = await web3.eth.personal.newAccount('aha');
    await transfer(
      web3,
      '0x7f3873ff8c9a66086d036aaf74e4830a5f1e265943c918da6cd690fd982d3342',
      addr,
      '10000000000000000000',
    );
    await web3.eth.personal.unlockAccount(addr, 'aha', 600);
    try {
      const newContract = await contract
        .deploy({
          arguments: [],
          data: bytecode.v,
        })
        .send({
          from: addr,
          gas,
        });
      contract = newContract;
      // contract.options.address
      process.env.CFC_CONTRACT_ADDR = contract.options.address;
      ownerAddr = addr;
    } catch (err) {
      throw err;
    }
    app = (await Test.createTestingModule({
      imports: [HttpModule, CronModule],
    }).compile()).createNestApplication();
    await app.init();
    // prepare AMQP
    amqpConnection = await connect(app.get(ConfigService).amqp);
    amqpChannel = await amqpConnection.createConfirmChannel();
  }, 10000);

  it('GET /coins', (done) => {
    request(app.getHttpServer())
      .get('/coins?coinSymbol=CFC')
      .use(signer)
      .expect(200)
      .end((err, res) => {
        if (err) {
          done.fail(err);
        }
        expect(res.body.chain).toStrictEqual('ethereum');
        expect(res.body.symbol).toStrictEqual('CFC');
        expect(res.body.depositFeeSymbol).toStrictEqual('ETH');
        expect(res.body.withdrawalFeeSymbol).toStrictEqual('ETH');
        done();
      });
  });

  it('GET /addrs', (done) => {
    request(app.getHttpServer())
      .get('/addrs?coinSymbol=CFC&path=1')
      .use(signer)
      .expect(200, '0xa51177407ee1799f75cE8664E56B080b7Bd8704d', done);
  });

  it(
    'should handle deposits',
    async (done) => {
      const value = '23400000000';
      const txHash = await transferToken(
        web3,
        contract,
        ownerAddr,
        '0xa51177407ee1799f75cE8664E56B080b7Bd8704d',
        value,
      );
      for (let i = 0; i < 5; i++) {
        await transfer(
          web3,
          '0x7f3873ff8c9a66086d036aaf74e4830a5f1e265943c918da6cd690fd982d3342',
          '0x39cdef1672f8af2f2c106e6cde7ea61c58811af4',
          '12312323',
        );
      }
      // deposit
      await app.get(CfcDeposit).cron();
      await new Promise((resolve) => {
        amqpChannel.consume('deposit_creation', async (msg) => {
          const body = JSON.parse(msg!.content.toString());
          if (body.txHash === txHash) {
            amqpChannel.ack(msg!);
            expect(body.status).toStrictEqual('unconfirmed');
            resolve();
          } else {
            amqpChannel.nack(msg!);
          }
        });
      });
      // confirm
      for (let i = 0; i <= 15; i++) {
        await transfer(
          web3,
          '0x7f3873ff8c9a66086d036aaf74e4830a5f1e265943c918da6cd690fd982d3342',
          '0x39cdef1672f8af2f2c106e6cde7ea61c58811af4',
          '12312323',
        );
      }
      await app.get(CfcConfirm).confirmCron();
      await new Promise((resolve) => {
        amqpChannel.consume('deposit_update', async (msg) => {
          const body = JSON.parse(msg!.content.toString());
          if (body.txHash === txHash) {
            amqpChannel.ack(msg!);
            expect(body.status).toStrictEqual('confirmed');
            resolve();
          } else {
            amqpChannel.nack(msg!);
          }
        });
      });
      // collect
      await app.get(CfcConfirm).payPreFee();
      await app.get(CfcCollect).cron();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const tokenBalance = await contract.methods
        .balanceOf('0xa51177407ee1799f75cE8664E56B080b7Bd8704d')
        .call();
      expect(tokenBalance).toStrictEqual('0');
      done();
    },
    20000,
  );

  it(
    'should handle withdrawals',
    async (done) => {
      await transferToken(
        web3,
        contract,
        ownerAddr,
        '0x5a34F15943453Cd6c71e401C1a92FCE26FD95ee0',
        '602000034500620',
      );
      await transfer(
        web3,
        '0x7f3873ff8c9a66086d036aaf74e4830a5f1e265943c918da6cd690fd982d3342',
        '0x5a34F15943453Cd6c71e401C1a92FCE26FD95ee0',
        '3000000000000000000',
      );
      const lW = yaml.safeLoad(
        fs.readFileSync(__dirname + '/fixtures/cfc-withdrawals.yml', 'ascii'),
      ) as Array<{ amount: number; recipient: string }>;
      const preBalance = new Map();
      lW.forEach(async (w, i) => {
        const bb = await contract.methods.balanceOf(w.recipient).call();
        preBalance.set(w.recipient, bb.toString());
        amqpChannel.sendToQueue(
          'withdrawal_creation',
          Buffer.from(
            JSON.stringify({
              amount: w.amount,
              coinSymbol: 'CFC',
              key: i,
              recipient: w.recipient,
            }),
          ),
        );
      });
      await amqpChannel.waitForConfirms();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await app.get(CfcWithdrawal).cron();
      const res = (await new Promise((resolve) => {
        const updates: { [_: string]: any } = {};
        const queue = 'withdrawal_update';
        amqpChannel.assertQueue(queue);
        amqpChannel.consume(queue, async (msg) => {
          const body = JSON.parse(msg!.content.toString());
          updates[body.key as string] = body;
          amqpChannel.ack(msg!);
          if (Object.keys(updates).length === lW.length) {
            resolve(Object.values(updates));
          }
        });
      })) as any[];
      for (let i = 0; i < lW.length; i++) {
        expect(res[i].recipient).toStrictEqual(lW[i].recipient);
        const afterBalance = await contract.methods
          .balanceOf(lW[i].recipient)
          .call();
        const vv = web3.utils
          .toBN(afterBalance)
          .sub(web3.utils.toBN(preBalance.get(lW[i].recipient)))
          .toString();

        const stringAmount = lW[i].amount.toString().split('.');
        if (!stringAmount[1]) {
          stringAmount[1] = '0';
        }
        if (stringAmount[1].length < 8) {
          const dis = 8 - stringAmount[1].length;
          for (let j = 0; j < dis; j++) {
            stringAmount[1] += '0';
          }
        }
        let pp = stringAmount[0] + stringAmount[1];
        let lt = 0;
        for (let j = 0; j < pp.length; j++) {
          if (pp[j] !== '0') {
            lt = j;
            break;
          }
        }
        pp = pp.substr(lt);

        expect(vv).toStrictEqual(pp);
        preBalance.set(lW[i].recipient, 0);
      }
      for (const v of lW) {
        expect(preBalance.get(v.recipient)).toStrictEqual(0);
      }
      done();
    },
    10000,
  );

  afterAll(async () => {
    await amqpConnection.close();
    await app.close();
  });
});
