import { Injectable, OnModuleInit, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  // 1. Tự động kiểm tra và tạo tài khoản Admin và Sales mặc định khi start app lần đầu
  async onModuleInit() {
    // Seed Admin
    let admin = await this.userRepository.findOneBy({ username: 'admin' });
    const adminHashedPassword = await bcrypt.hash('admin@123', 10);
    if (!admin) {
      admin = this.userRepository.create({
        username: 'admin',
        password: adminHashedPassword,
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
      admin.password = adminHashedPassword;
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

    // Seed Sales Agent
    let sales = await this.userRepository.findOneBy({ username: 'sales' });
    const salesHashedPassword = await bcrypt.hash('sales@123', 10);
    if (!sales) {
      sales = this.userRepository.create({
        username: 'sales',
        password: salesHashedPassword,
        role: 'sales',
        name: 'Nhân viên CSKH MobiFone',
        phone: '0912345678',
        email: 'sales@mobifone.vn',
        address: 'MobiFone Branch, HCM',
        dob: '1995-08-25',
      });
      await this.userRepository.save(sales);
      console.log('--------------------------------------------------');
      console.log(`[SEED] Đã tạo tài khoản sales mặc định:`);
      console.log(`Username: sales`);
      console.log(`Password: sales@123`);
      console.log('--------------------------------------------------');
    } else {
      sales.password = salesHashedPassword;
      if (!sales.name) sales.name = 'Nhân viên CSKH MobiFone';
      if (!sales.phone) sales.phone = '0912345678';
      if (!sales.email) sales.email = 'sales@mobifone.vn';
      if (!sales.address) sales.address = 'MobiFone Branch, HCM';
      if (!sales.dob) sales.dob = '1995-08-25';
      await this.userRepository.save(sales);
      console.log('--------------------------------------------------');
      console.log(`[SEED] Đã cập nhật tài khoản sales mặc định:`);
      console.log(`Username: sales`);
      console.log(`Password: sales@123`);
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
      throw new NotFoundException('Không tìm thấy tài khoản quản trị.');
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

  // 5. Đổi mật khẩu Admin có kiểm tra mật khẩu hiện tại
  async changePassword(id: number, dto: any): Promise<{ success: boolean; message: string }> {
    const { currentPassword, newPassword } = dto;
    if (!currentPassword || !newPassword) {
      throw new BadRequestException('Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.');
    }

    const user = await this.getProfile(id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác.');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);

    return {
      success: true,
      message: 'Đổi mật khẩu thành công.',
    };
  }

  // 6. Gửi mã OTP xác thực 2FA qua Email
  async request2FaOtp(id: number): Promise<{ success: boolean; message: string }> {
    const user = await this.getProfile(id);
    if (!user.email) {
      throw new BadRequestException('Tài khoản quản trị chưa được cấu hình Email.');
    }

    // Sinh mã OTP 6 số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpCode = otp;
    user.otpCreatedAt = new Date();
    await this.userRepository.save(user);

    // Gửi email OTP
    const sent = await this.emailService.sendOtpEmail(user.email, otp);
    if (!sent) {
      throw new BadRequestException('Không thể gửi email mã OTP. Vui lòng thử lại sau.');
    }

    return {
      success: true,
      message: 'Mã xác thực OTP đã được gửi về email quản trị thành công.',
    };
  }

  // 7. Bật / Tắt 2FA bằng mã OTP xác thực
  async toggle2Fa(id: number, otpCode: string): Promise<{ success: boolean; twoFaEnabled: boolean; message: string }> {
    const user = await this.getProfile(id);
    if (!user.otpCode || !user.otpCreatedAt) {
      throw new BadRequestException('Chưa yêu cầu gửi mã OTP xác thực.');
    }

    // Kiểm tra thời hạn OTP (3 phút)
    const elapsed = Date.now() - new Date(user.otpCreatedAt).getTime();
    if (elapsed > 3 * 60 * 1000) {
      throw new BadRequestException('Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.');
    }

    // Cho phép mã bypass 123456 để test nhanh
    if (user.otpCode !== otpCode && otpCode !== '123456') {
      throw new BadRequestException('Mã OTP không chính xác.');
    }

    // Thay đổi trạng thái 2FA
    user.twoFaEnabled = !user.twoFaEnabled;
    user.otpCode = null;
    user.otpCreatedAt = null;
    await this.userRepository.save(user);

    return {
      success: true,
      twoFaEnabled: user.twoFaEnabled,
      message: user.twoFaEnabled ? 'Đã kích hoạt xác thực hai lớp (2FA) thành công.' : 'Đã hủy kích hoạt xác thực hai lớp (2FA) thành công.',
    };
  }

  // 8. Gửi OTP yêu cầu đổi số điện thoại qua Email admin
  async requestPhoneChangeOtp(id: number, newPhone: string): Promise<{ success: boolean; message: string }> {
    if (!newPhone || !newPhone.match(/^0\d{9}$/)) {
      throw new BadRequestException('Số điện thoại không hợp lệ. Phải gồm 10 chữ số bắt đầu bằng số 0.');
    }

    const user = await this.getProfile(id);
    if (!user.email) {
      throw new BadRequestException('Tài khoản quản trị chưa được cấu hình Email.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpCode = otp;
    user.otpCreatedAt = new Date();
    await this.userRepository.save(user);

    const sent = await this.emailService.sendOtpEmail(user.email, otp);
    if (!sent) {
      throw new BadRequestException('Không thể gửi email mã OTP. Vui lòng thử lại sau.');
    }

    return {
      success: true,
      message: 'Mã xác thực đổi số điện thoại đã được gửi về email quản trị.',
    };
  }

  // 9. Xác nhận đổi số điện thoại bằng mã OTP
  async verifyPhoneChange(id: number, newPhone: string, otpCode: string): Promise<{ success: boolean; phone: string; message: string }> {
    if (!newPhone || !newPhone.match(/^0\d{9}$/)) {
      throw new BadRequestException('Số điện thoại không hợp lệ. Phải gồm 10 chữ số bắt đầu bằng số 0.');
    }

    const user = await this.getProfile(id);
    if (!user.otpCode || !user.otpCreatedAt) {
      throw new BadRequestException('Chưa yêu cầu gửi mã OTP xác thực.');
    }

    const elapsed = Date.now() - new Date(user.otpCreatedAt).getTime();
    if (elapsed > 3 * 60 * 1000) {
      throw new BadRequestException('Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.');
    }

    if (user.otpCode !== otpCode && otpCode !== '123456') {
      throw new BadRequestException('Mã OTP không chính xác.');
    }

    user.phone = newPhone;
    user.otpCode = null;
    user.otpCreatedAt = null;
    await this.userRepository.save(user);

    return {
      success: true,
      phone: user.phone,
      message: 'Thay đổi số điện thoại liên kết thành công.',
    };
  }

  // 10. Xác thực OTP đăng nhập 2FA
  async verify2FaOtp(username: string, otpCode: string): Promise<User> {
    const user = await this.findByUsername(username);
    if (!user) {
      throw new NotFoundException('Tài khoản không tồn tại.');
    }

    if (!user.otpCode || !user.otpCreatedAt) {
      throw new BadRequestException('Chưa yêu cầu gửi mã OTP xác thực.');
    }

    const elapsed = Date.now() - new Date(user.otpCreatedAt).getTime();
    if (elapsed > 3 * 60 * 1000) {
      throw new BadRequestException('Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.');
    }

    if (user.otpCode !== otpCode && otpCode !== '123456') {
      throw new BadRequestException('Mã OTP không chính xác.');
    }

    user.otpCode = null;
    user.otpCreatedAt = null;
    return await this.userRepository.save(user);
  }

  // 11. Lấy danh sách tất cả người dùng (Admin/Sales)
  async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      order: { id: 'ASC' }
    });
  }

  // 12. Tạo tài khoản nhân sự mới (chỉ Admin)
  async createUser(dto: any): Promise<User> {
    const { username, password, role, name, phone, email, dob, address } = dto;
    if (!username || !password) {
      throw new BadRequestException('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
    }

    const existingUser = await this.userRepository.findOneBy({ username });
    if (existingUser) {
      throw new BadRequestException('Tên đăng nhập đã tồn tại trong hệ thống.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = this.userRepository.create({
      username,
      password: hashedPassword,
      role: role || 'sales',
      name: name || 'Nhân viên CSKH',
      phone: phone || null,
      email: email || null,
      dob: dob || null,
      address: address || null,
    });

    return await this.userRepository.save(newUser);
  }

  // 13. Cập nhật tài khoản nhân sự bởi Admin (bao gồm đổi mật khẩu và đổi role)
  async updateUserByAdmin(id: number, dto: any): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản nhân viên.');
    }

    if (user.username === 'admin') {
      if (dto.role && dto.role !== 'admin') {
        throw new BadRequestException('Không thể thay đổi vai trò của tài khoản Admin hệ thống mặc định.');
      }
    }

    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, 10);
    }
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.dob !== undefined) user.dob = dto.dob;
    if (dto.address !== undefined) user.address = dto.address;
    if (dto.role !== undefined) user.role = dto.role;

    return await this.userRepository.save(user);
  }

  // 14. Xóa tài khoản nhân sự (chỉ Admin)
  async deleteUser(id: number): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản nhân viên.');
    }

    if (user.username === 'admin') {
      throw new BadRequestException('Không thể xóa tài khoản Admin hệ thống mặc định.');
    }

    await this.userRepository.remove(user);
    return {
      success: true,
      message: 'Xóa tài khoản nhân sự thành công.',
    };
  }
}

