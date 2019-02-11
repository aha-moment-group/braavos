import {
  Controller,
  Get,
  Inject,
  Injectable,
  NotFoundException,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiImplicitQuery,
  ApiNotFoundResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Matches } from 'class-validator';
import { ChainService } from '../chains';
import { CoinEnum } from '../coins';
import { Client } from '../entities/client.entity';
import { Coin } from '../entities/coin.entity';
import { Deposit } from '../entities/deposit.entity';
import { Withdrawal } from '../entities/withdrawal.entity';
import { DClient } from './client.decorator';
import { SignatureGuard } from './signature.guard';

@ApiBearerAuth()
@Controller()
@Injectable()
@UseGuards(SignatureGuard)
@UsePipes(ValidationPipe)
export class HttpController {
  private readonly coinServices: { [_ in CoinEnum]?: ChainService };

  constructor(
    @Inject('CoinServiceRepo') coinServices: { [_ in CoinEnum]?: ChainService },
  ) {
    this.coinServices = coinServices;
  }

  @Get('addrs')
  @ApiImplicitQuery({
    description: '数字货币符号',
    enum: Object.keys(CoinEnum),
    name: 'coinSymbol',
    type: 'string',
  })
  @ApiImplicitQuery({
    description:
      '地址路径，由数字和斜杠组成且斜杠不能连续出现，通常使用终端用户的数字标识符即可',
    name: 'path',
  })
  @ApiOkResponse({ type: String })
  public findAddr(
    @DClient() client: Client,
    @Query('coinSymbol') coinSymbol: CoinEnum,
    @Matches(/^\d+(\/\d+)*$/)
    @Query('path')
    path: string,
  ): Promise<string> {
    const coinService = this.coinServices[coinSymbol];
    if (!coinService) {
      throw new NotFoundException();
    }
    return coinService.getAddr(client.id, path);
  }

  @Get('deposits')
  @ApiOkResponse({ type: [Deposit] })
  public findDeposits(
    @DClient() client: Client,
    @Query('limit') limit: number,
    @Query('offset') offset: number,
  ): Promise<Deposit[]> {
    return Deposit.createQueryBuilder()
      .where({ clientId: client.id })
      .orderBy('id')
      .skip(offset)
      .take(limit)
      .getMany();
  }

  @Get('withdrawals')
  @ApiOkResponse({ type: [Withdrawal] })
  public findWithdrawals(
    @DClient() client: Client,
    @Query('limit') limit: number,
    @Query('offset') offset: number,
  ): Promise<Withdrawal[]> {
    return Withdrawal.createQueryBuilder()
      .where({ clientId: client.id })
      .orderBy('id')
      .skip(offset)
      .take(limit)
      .getMany();
  }

  @Get('coins')
  @ApiImplicitQuery({
    description: '数字货币符号',
    enum: Object.keys(CoinEnum),
    name: 'coinSymbol',
    type: 'string',
  })
  @ApiOkResponse({ description: '数字货币详情', type: Coin })
  @ApiNotFoundResponse({ description: '货币符号不存在' })
  public async getCoins(@Query('coinSymbol') coinSymbol: CoinEnum) {
    const coin = await Coin.findOne(coinSymbol);
    if (!coin) {
      throw new NotFoundException();
    }
    return coin;
  }
}
