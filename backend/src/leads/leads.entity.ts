import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// 1. Decorator báo cho TypeORM biết đây là 1 bảng trong Database tên là 'leads'
@Entity('leads')
export class Lead {
  // 2. Cột ID tự động tăng (Khóa chính)
  @PrimaryGeneratedColumn()
  id: number;

  // 3. Cột tên khách hàng (có thể để trống nếu bot chưa hỏi được tên)
  @Column({ nullable: true })
  name: string;

  // 4. Cột số điện thoại (Bắt buộc phải có để liên hệ)
  @Column()
  phone: string;

  // 5. Gói cước hoặc chủ đề khách hàng quan tâm 
  @Column({ nullable: true })
  interest: string;

  // 6. Trạng thái chăm sóc (Chưa liên hệ, Đang liên hệ, Đã liên hệ, v.v.)
  @Column({ default: 'Chưa liên hệ' })
  status: string;

  // 7. Cột tự động lưu thời gian tạo bản ghi
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
