import { Matches } from 'class-validator';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { ChainEnum } from '../chains/chain.enum';
import { Client } from './client.entity';

@Entity()
@Index(['chain', 'addr'], { unique: true })
export class Addr extends BaseEntity {
  @PrimaryColumn({ enum: ChainEnum, type: 'enum' })
  public chain!: ChainEnum;

  @PrimaryColumn()
  public clientId!: number;

  @PrimaryColumn()
  @Matches(/^\d+(\/\d+)*$/)
  public path!: string;

  @Column()
  public addr!: string;

  @Column({ default: {}, type: 'jsonb' })
  public info: any;

  @CreateDateColumn()
  public createdAt!: Date;

  @ManyToOne(() => Client)
  public client!: Client;
}
