import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('packages')
export class Package {
  @PrimaryColumn({ type: 'varchar' })
  id: string; // Mã gói cước viết hoa, e.g., 'TK135'

  @Column({ type: 'varchar' })
  name: string; // Tên gói cước hiển thị, e.g., 'TK135'

  @Column({ type: 'varchar' })
  price: string; // Giá hiển thị, e.g., '135.000đ'

  @Column({ type: 'varchar' })
  data: string; // Mô tả data, e.g., '4GB/ngày'

  @Column({ type: 'varchar' })
  voice: string; // Mô tả phút gọi, e.g., 'Nội mạng miễn phí'

  @Column({ type: 'varchar' })
  validity: string; // Thời hạn sử dụng, e.g., '30 ngày'

  @Column({ type: 'varchar' })
  category: 'data' | 'voice' | 'unlimited'; // Thể loại gói cước

  @Column({ type: 'simple-json', nullable: true })
  features: string[]; // Mảng các tính năng nổi bật, e.g., ['5G Ready', 'Free YouTube']

  @Column({ type: 'varchar', default: '#0055A5' })
  color: string; // Màu chủ đạo của thẻ gói cước

  @Column({ type: 'boolean', default: false })
  popular: boolean; // Gói cước có nổi bật hay không

  @Column({ type: 'integer', default: 120 })
  dataTotalGB: number; // Tổng số GB của gói cước, e.g., 120

  @Column({ type: 'integer', default: 600 })
  voiceTotalMin: number; // Tổng số phút gọi thoại, e.g., 600

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
