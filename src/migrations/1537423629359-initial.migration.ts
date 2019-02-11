import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1537423629359 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
      CREATE TYPE "chain_name_enum" AS ENUM('bitcoin', 'ethereum', 'eos');

      CREATE TYPE "coin_symbol_enum" AS ENUM('BTC', 'ETH', 'EOS', 'CFC');

      CREATE TYPE "deposit_status_enum"
      AS ENUM('unconfirmed', 'confirmed', 'finished', 'attacked');

      CREATE TYPE "withdrawal_status_enum" AS ENUM('created', 'finished');

      CREATE TABLE "chain" (
        "name"      "chain_name_enum" PRIMARY KEY,
        "coldAddr"  varchar           NOT NULL,
        "info"      jsonb             NOT NULL DEFAULT '{}',
        "updatedAt" TIMESTAMP         NOT NULL DEFAULT now()
      );

      CREATE TABLE "coin" (
        "symbol"              "coin_symbol_enum" PRIMARY KEY,
        "chain"               "chain_name_enum"  NOT NULL REFERENCES "chain"("name"),
        "depositFeeAmount"    real               NOT NULL,
        "depositFeeSymbol"    "coin_symbol_enum" NOT NULL,
        "withdrawalFeeAmount" real               NOT NULL,
        "withdrawalFeeSymbol" "coin_symbol_enum" NOT NULL,
        "info"                jsonb              NOT NULL DEFAULT '{}',
        "updatedAt"           TIMESTAMP          NOT NULL DEFAULT now()
      );

      CREATE TABLE "client" (
        "id"        SERIAL  PRIMARY KEY,
        "name"      varchar NOT NULL,
        "publicKey" varchar NOT NULL,
        "ip"        varchar,
        UNIQUE ("name")
      );

      CREATE TABLE "addr" (
        "chain"     "chain_name_enum" NOT NULL REFERENCES "chain"("name"),
        "clientId"  integer           NOT NULL REFERENCES "client"("id") ON DELETE CASCADE,
        "path"      varchar           NOT NULL,
        "addr"      varchar           NOT NULL,
        "info"      jsonb             NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP         NOT NULL DEFAULT now(),
        PRIMARY KEY ("chain", "clientId", "path"),
        UNIQUE ("chain", "addr")
      );

      CREATE TABLE "account" (
        "coinSymbol" "coin_symbol_enum" NOT NULL,
        "clientId"   integer            NOT NULL REFERENCES "client"("id") ON DELETE CASCADE,
        "frozen"     boolean            NOT NULL DEFAULT false,
        "balance"    numeric(24,8)      NOT NULL DEFAULT 0,
        "info"       jsonb              NOT NULL DEFAULT '{}',
        "updatedAt"  TIMESTAMP          NOT NULL DEFAULT now(),
        PRIMARY KEY ("coinSymbol", "clientId")
      );

      CREATE TABLE "deposit" (
        "id"           SERIAL                PRIMARY KEY,
        "coinSymbol"   "coin_symbol_enum"    NOT NULL,
        "clientId"     integer               NOT NULL REFERENCES "client"("id") ON DELETE CASCADE,
        "addrPath"     varchar               NOT NULL,
        "amount"       numeric(16,8)         NOT NULL,
        "feeAmount"    real                  ,
        "feeSymbol"    "coin_symbol_enum"    ,
        "status"       "deposit_status_enum" NOT NULL DEFAULT 'unconfirmed',
        "txHash"       varchar               ,
        "info"         jsonb                 NOT NULL DEFAULT '{}',
        "createdAt"    TIMESTAMP             NOT NULL DEFAULT now(),
        "withdrawalId" integer               ,
        UNIQUE ("withdrawalId")
      );

      CREATE TABLE "withdrawal" (
        "id"         SERIAL                   PRIMARY KEY,
        "clientId"   integer                  NOT NULL REFERENCES "client"("id") ON DELETE CASCADE,
        "key"        varchar                  NOT NULL,
        "coinSymbol" "coin_symbol_enum"       NOT NULL,
        "recipient"  varchar                  NOT NULL,
        "memo"       varchar                  ,
        "amount"     numeric(16,8)            NOT NULL,
        "feeAmount"  real                     ,
        "feeSymbol"  "coin_symbol_enum"       ,
        "status"     "withdrawal_status_enum" NOT NULL DEFAULT 'created',
        "txHash"     varchar                  ,
        "info"       jsonb                    NOT NULL DEFAULT '{}',
        "createdAt"  TIMESTAMP                NOT NULL DEFAULT now(),
        "depositId"  integer                  ,
        UNIQUE ("depositId"),
        UNIQUE ("clientId", "key")
      );

      CREATE TABLE "kv_pair" (
        "key"   varchar PRIMARY KEY,
        "value" jsonb   NOT NULL
      );

      ALTER TABLE "deposit"
      ADD CONSTRAINT "fk_deposit_withdrawal"
      FOREIGN KEY ("withdrawalId")
      REFERENCES "withdrawal"("id");

      ALTER TABLE "withdrawal"
      ADD CONSTRAINT "fk_withdrawal_deposit"
      FOREIGN KEY ("depositId")
      REFERENCES "deposit"("id");

      INSERT INTO "chain" ("name", "coldAddr")
      VALUES ('bitcoin', '');

      INSERT INTO "chain" ("name", "coldAddr")
      VALUES ('ethereum', '');

      INSERT INTO "coin" (
        "chain", "depositFeeAmount", "depositFeeSymbol", "symbol",
        "withdrawalFeeAmount", "withdrawalFeeSymbol", "info"
      ) VALUES (
        'bitcoin', 0, 'BTC', 'BTC',
        0, 'BTC', '{ "depositMilestone": "", "withdrawalMilestone": "" }'::jsonb
      );

      INSERT INTO "coin" (
        "chain", "depositFeeAmount", "depositFeeSymbol", "symbol",
        "withdrawalFeeAmount", "withdrawalFeeSymbol", "info"
      ) VALUES (
        'ethereum', 0, 'ETH', 'ETH',
        0, 'ETH', '{ "cursor": 0, "fee": 0 }'::jsonb
      );

      INSERT INTO "coin" (
        "chain", "depositFeeAmount", "depositFeeSymbol", "symbol",
        "withdrawalFeeAmount", "withdrawalFeeSymbol", "info"
      ) VALUES (
        'ethereum', 0, 'ETH', 'CFC',
        0, 'ETH', '{ "cursor": 0, "fee": 0 }'::jsonb
      );

      INSERT INTO "kv_pair" ("key", "value")
      VALUES ('ethWithdrawalNonce', '0'::jsonb);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
      ALTER TABLE "withdrawal" DROP CONSTRAINT "fk_withdrawal_deposit";
      ALTER TABLE "deposit" DROP CONSTRAINT "fk_deposit_withdrawal";
      DROP TABLE "kv_pair";
      DROP TABLE "withdrawal";
      DROP TABLE "deposit";
      DROP TABLE "account";
      DROP TABLE "addr";
      DROP TABLE "client";
      DROP TABLE "coin";
      DROP TABLE "chain";
      DROP TYPE "withdrawal_status_enum";
      DROP TYPE "deposit_status_enum";
      DROP TYPE "coin_symbol_enum";
      DROP TYPE "chain_name_enum";
    `);
  }
}
