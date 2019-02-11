import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CoinEnum } from '../coins/coin.enum';
import { Client } from './client.entity';

@Entity()
export class Account extends BaseEntity {
  @PrimaryColumn({ enum: CoinEnum, type: 'enum' })
  public coinSymbol!: CoinEnum;

  @PrimaryColumn()
  public clientId!: number;

  @Column({ default: 0, precision: 24, scale: 8, type: 'decimal' })
  public balance!: string;

  @Column({ default: {}, type: 'jsonb' })
  public info: any;

  @UpdateDateColumn()
  public updatedAt!: Date;

  @ManyToOne(() => Client)
  public client!: Client;
}
