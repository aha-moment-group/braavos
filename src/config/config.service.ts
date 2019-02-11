import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { mnemonicToSeed } from 'bip39';
import dotenv from 'dotenv';
import bitcoinConfig from './bitcoin';
import ethereumConfig from './ethereum';

export class ConfigService implements TypeOrmOptionsFactory {
  constructor() {
    dotenv.config({ path: './.env' });
  }

  get environment() {
    const res = process.env.NODE_ENV || 'development';
    if (!['development', 'test', 'production'].includes(res)) {
      throw new Error();
    }
    return res;
  }

  get isProduction() {
    return this.environment === 'production';
  }

  private get mnemonic() {
    const res = process.env.MNEMONIC;
    if (typeof res !== 'string') {
      throw new Error();
    }
    return res;
  }

  get seed(): Buffer {
    return mnemonicToSeed(this.mnemonic);
  }

  public createTypeOrmOptions(): TypeOrmModuleOptions {
    if (
      process.env.TYPEORM_CONNECTION !== 'postgres' ||
      !process.env.TYPEORM_ENTITIES ||
      !process.env.TYPEORM_MIGRATIONS
    ) {
      throw new Error();
    }
    return {
      database: process.env.TYPEORM_DATABASE,
      entities: [process.env.TYPEORM_ENTITIES],
      host: process.env.TYPEORM_HOST,
      migrations: [process.env.TYPEORM_MIGRATIONS],
      password: process.env.TYPEORM_PASSWORD,
      port: Number(process.env.TYPEORM_PORT),
      type: 'postgres',
      username: process.env.TYPEORM_USERNAME,
    };
  }

  get amqp() {
    const res = process.env.AMQP;
    if (!res) {
      throw new Error();
    }
    return res;
  }

  get httpPort() {
    return Number(process.env.HTTP_PORT);
  }

  get dashboardPort() {
    return Number(process.env.DASH_PORT);
  }

  get bitcoin() {
    return bitcoinConfig;
  }

  get ethereum() {
    return ethereumConfig;
  }
}
