import { NestFactory } from '@nestjs/core';
import { CronModule } from './crons/cron.module';

async function bootstrap() {
  await NestFactory.createApplicationContext(CronModule);
}

bootstrap();
