import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  // Tên đăng nhập (duy nhất, không trùng lặp)
  @Column({ unique: true })
  username: string;

  // Mật khẩu (sẽ được lưu dưới dạng băm/hash bằng bcrypt)
  @Column()
  password: string;

  // Vai trò của người dùng (mặc định là 'admin')
  @Column({ default: 'admin' })
  role: string;

  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  dob: string | null;

  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  @Column({ type: 'text', nullable: true })
  avatar: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
