import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfirmChannel, connect, Connection } from 'amqplib';
import fs from 'fs';
import 'jest';
import yaml from 'js-yaml';
import * as schedule from 'nest-schedule';
import signature from 'superagent-http-signature';
import request from 'supertest';
import Web3 from 'web3';
import { ConfigService } from '../src/config/config.service';
import { CronModule } from '../src/crons/cron.module';
import { EthCollect } from '../src/crons/eth-collect';
import { EthConfirm } from '../src/crons/eth-confirm';
import { EthDeposit } from '../src/crons/eth-deposit';
import { EthWithdrawal } from '../src/crons/eth-withdrawal';
import { HttpModule } from '../src/http/http.module';

const transfer = async (
  web3: Web3,
  prv: string,
  to: string,
  value: string,
): Promise<string> => {
  const signTx = await web3.eth.accounts.signTransaction(
    { gas: 21000, to, value },
    prv,
  );
  const tx = await web3.eth.sendSignedTransaction(signTx.rawTransaction);
  return tx.transactionHash;
};

describe('ETH (e2e)', () => {
  let app: INestApplication;
  let amqpConnection: Connection;
  let amqpChannel: ConfirmChannel;
  let web3: Web3;
  const signer = signature({
    algorithm: 'rsa-sha256',
    headers: ['(request-target)', 'date', 'content-md5'],
    key: fs.readFileSync(__dirname + '/fixtures/private.pem', 'ascii'),
    keyId: '/test/keys/1a:2b',
  });

  beforeAll(async () => {
    schedule.defaults.enable = false;
    app = (await Test.createTestingModule({
      imports: [HttpModule, CronModule],
    }).compile()).createNestApplication();
    await app.init();
    // prepare AMQP
    amqpConnection = await connect(app.get(ConfigService).amqp);
    amqpChannel = await amqpConnection.createConfirmChannel();
    // prepare Web3
    web3 = app.get(Web3);
  });

  it('GET /coins', (done) => {
    request(app.getHttpServer())
      .get('/coins?coinSymbol=ETH')
      .use(signer)
      .expect(200)
      .end((err, res) => {
        if (err) {
          done.fail(err);
        }
        expect(res.body.chain).toStrictEqual('ethereum');
        expect(res.body.symbol).toStrictEqual('ETH');
        expect(res.body.depositFeeSymbol).toStrictEqual('ETH');
        expect(res.body.withdrawalFeeSymbol).toStrictEqual('ETH');
        done();
      });
  });

  it('GET /addrs', (done) => {
    request(app.getHttpServer())
      .get('/addrs?coinSymbol=ETH&path=1')
      .use(signer)
      .expect(200, '0xa51177407ee1799f75cE8664E56B080b7Bd8704d', done);
  });

  it(
    'should handle deposits',
    async (done) => {
      const value = web3.utils.toBN(web3.utils.toWei('0.01', 'ether'));
      const prv =
        '0x7f3873ff8c9a66086d036aaf74e4830a5f1e265943c918da6cd690fd982d3342';
      const txHash = await transfer(
        web3,
        prv,
        '0xa51177407ee1799f75cE8664E56B080b7Bd8704d',
        value.toString(),
      );
      for (let i = 0; i < 4; i++) {
        await transfer(
          web3,
          prv,
          '0x39cdef1672f8af2f2c106e6cde7ea61c58811af4',
          value.toString(),
        );
      }
      await app.get(EthDeposit).cron();
      expect(typeof txHash).toStrictEqual('string');
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
      for (let i = 0; i <= 15; i++) {
        await transfer(
          web3,
          prv,
          '0x39cdef1672f8af2f2c106e6cde7ea61c58811af4',
          value.toString(),
        );
      }
      await app.get(EthConfirm).cron();
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
      const preBalance = await web3.eth.getBalance(
        '0xa51177407ee1799f75cE8664E56B080b7Bd8704d',
      );
      await app.get(EthCollect).cron();
      const balance = await web3.eth.getBalance(
        '0xa51177407ee1799f75cE8664E56B080b7Bd8704d',
      );
      expect(balance).toStrictEqual('0');
      done();
    },
    10000,
  );

  it(
    'should handle withdrawals',
    async (done) => {
      await transfer(
        web3,
        '0x2d226f5f9519c5c22e84ef94b6d02a33a65e2d2b080351166b3ff063e1a017c1',
        '0x5a34F15943453Cd6c71e401C1a92FCE26FD95ee0',
        '5500000000000000000',
      );
      const lW = yaml.safeLoad(
        fs.readFileSync(__dirname + '/fixtures/eth-withdrawals.yml', 'ascii'),
      ) as Array<{ amount: number; recipient: string }>;
      const preBalance = new Map();
      lW.forEach(async (w, i) => {
        const bb = await web3.eth.getBalance(w.recipient);
        preBalance.set(w.recipient, bb.toString());
        amqpChannel.sendToQueue(
          'withdrawal_creation',
          Buffer.from(
            JSON.stringify({
              amount: w.amount,
              coinSymbol: 'ETH',
              key: i,
              recipient: w.recipient,
            }),
          ),
        );
      });
      await amqpChannel.waitForConfirms();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await app.get(EthWithdrawal).cron();
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
        const afterBalance = await web3.eth.getBalance(lW[i].recipient);
        const vv = web3.utils
          .toBN(afterBalance)
          .sub(web3.utils.toBN(preBalance.get(lW[i].recipient)))
          .toString();
        const pp = web3.utils
          .toBN(web3.utils.toWei(res[i].amount, 'ether'))
          .toString();
        expect(vv).toStrictEqual(pp);
        preBalance.set(lW[i].recipient, 0);
      }
      for (const v of lW) {
        expect(preBalance.get(v.recipient)).toStrictEqual(0);
      }
      done();
    },
    20000,
  );

  afterAll(async () => {
    await amqpConnection.close();
    await app.close();
  });
});
