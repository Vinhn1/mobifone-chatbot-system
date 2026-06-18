import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // 1. Tự động kiểm tra và tạo tài khoản Admin mặc định khi start app lần đầu
  async onModuleInit() {
    let admin = await this.userRepository.findOneBy({ username: 'admin' });
    const hashedPassword = await bcrypt.hash('admin@123', 10);
    if (!admin) {
      admin = this.userRepository.create({
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
      });
      await this.userRepository.save(admin);
      console.log('--------------------------------------------------');
      console.log(`[SEED] Đã tạo tài khoản admin mặc định:`);
      console.log(`Username: admin`);
      console.log(`Password: admin@123`);
      console.log('--------------------------------------------------');
    } else {
      admin.password = hashedPassword;
      await this.userRepository.save(admin);
      console.log('--------------------------------------------------');
      console.log(`[SEED] Đã cập nhật tài khoản admin mặc định:`);
      console.log(`Username: admin`);
      console.log(`Password: admin@123`);
      console.log('--------------------------------------------------');
    }
  }

  // 2. Hàm tìm người dùng theo username (dành cho module Auth kiểm tra)
  async findByUsername(username: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { username } });
  }
}

