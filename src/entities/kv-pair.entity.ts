import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class KvPair extends BaseEntity {
  @PrimaryColumn()
  public key!: string;

  @Column({ type: 'jsonb' })
  public value: any;
}
