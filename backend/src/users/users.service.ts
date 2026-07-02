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
        name: 'MobiFone Administrator',
        phone: '0987654321',
        email: 'admin@mobifone.vn',
        address: 'MobiFone HQ, Hà Nội',
        dob: '1988-05-12',
      });
      await this.userRepository.save(admin);
      console.log('--------------------------------------------------');
      console.log(`[SEED] Đã tạo tài khoản admin mặc định:`);
      console.log(`Username: admin`);
      console.log(`Password: admin@123`);
      console.log('--------------------------------------------------');
    } else {
      admin.password = hashedPassword;
      if (!admin.name) admin.name = 'MobiFone Administrator';
      if (!admin.phone) admin.phone = '0987654321';
      if (!admin.email) admin.email = 'admin@mobifone.vn';
      if (!admin.address) admin.address = 'MobiFone HQ, Hà Nội';
      if (!admin.dob) admin.dob = '1988-05-12';
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

  // 3. Lấy profile admin theo id
  async getProfile(id: number): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new Error('Không tìm thấy tài khoản quản trị.');
    }
    return user;
  }

  // 4. Cập nhật profile admin
  async updateProfile(id: number, profileData: Partial<User>): Promise<User> {
    const user = await this.getProfile(id);
    const allowedFields: (keyof User)[] = ['name', 'email', 'dob', 'address', 'avatar'];
    for (const key of allowedFields) {
      if (profileData[key] !== undefined) {
        (user as any)[key] = profileData[key];
      }
    }
    return await this.userRepository.save(user);
  }
}

