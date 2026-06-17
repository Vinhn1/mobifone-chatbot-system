import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('subscribers')
export class Subscriber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  phoneNumber: string;

  @Column({ type: 'varchar', nullable: true })
  currentPackage: string | null;

  @Column({ type: 'float', default: 0 })
  dataUsedGB: number;

  @Column({ type: 'float', default: 0 })
  dataTotalGB: number;

  @Column({ type: 'timestamp', nullable: true })
  packageExpiry: Date | null;

  @Column({ type: 'varchar', nullable: true })
  otpCode: string | null;

  @Column({ type: 'timestamp', nullable: true })
  otpCreatedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  dob: string | null;

  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
