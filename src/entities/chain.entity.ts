import {
  BaseEntity,
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChainEnum } from '../chains/chain.enum';

@Entity()
export class Chain extends BaseEntity {
  @PrimaryColumn({ enum: ChainEnum, type: 'enum' })
  public name!: ChainEnum;

  @Column()
  public coldAddr!: string;

  @Column({ default: {}, type: 'jsonb' })
  public info: any;

  @UpdateDateColumn()
  public updatedAt!: Date;
}
