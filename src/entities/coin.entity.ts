import { ApiModelProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import {
  BaseEntity,
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChainEnum } from '../chains/chain.enum';
import { CoinEnum } from '../coins/coin.enum';

@Entity()
export class Coin extends BaseEntity {
  @ApiModelProperty({ description: '数字货币符号' })
  @PrimaryColumn({ enum: CoinEnum, type: 'enum' })
  public symbol!: CoinEnum;

  @Exclude()
  @Column({ enum: ChainEnum, type: 'enum' })
  public chain!: ChainEnum;

  @ApiModelProperty({ description: '充币手续费数量', type: 'real' })
  @Column()
  public depositFeeAmount!: number;

  @ApiModelProperty({ description: '充币手续费单位符号' })
  @Column({ enum: CoinEnum, type: 'enum' })
  public depositFeeSymbol!: CoinEnum;

  @ApiModelProperty({ description: '提币手续费数量', type: 'real' })
  @Column()
  public withdrawalFeeAmount!: number;

  @ApiModelProperty({ description: '提币手续费单位符号' })
  @Column({ enum: CoinEnum, type: 'enum' })
  public withdrawalFeeSymbol!: CoinEnum;

  @Exclude()
  @Column({ default: {}, type: 'jsonb' })
  public info: any;

  @ApiModelProperty()
  @UpdateDateColumn()
  public updatedAt!: Date;
}
