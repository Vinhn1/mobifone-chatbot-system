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
    const userCount = await this.userRepository.count();
    if (userCount === 0) {
      const defaultUsername = 'admin';
      const defaultPassword = 'admin123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      const defaultAdmin = this.userRepository.create({
        username: defaultUsername,
        password: hashedPassword,
        role: 'admin',
      });

      await this.userRepository.save(defaultAdmin);
      console.log('--------------------------------------------------');
      console.log(`[SEED] Đã tạo tài khoản admin mặc định:`);
      console.log(`Username: ${defaultUsername}`);
      console.log(`Password: ${defaultPassword}`);
      console.log('--------------------------------------------------');
    }
  }

  // 2. Hàm tìm người dùng theo username (dành cho module Auth kiểm tra)
  async findByUsername(username: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { username } });
  }
}

