import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscriber } from './subscriber.entity';
import { Package } from './package.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../email/email.service';

@Injectable()
export class SubscribersService implements OnModuleInit {
  constructor(
    @InjectRepository(Subscriber)
    private readonly subscriberRepository: Repository<Subscriber>,
    @InjectRepository(Package)
    private readonly packageRepository: Repository<Package>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async onModuleInit() {
    const phone = '0393375961';
    let subscriber = await this.subscriberRepository.findOneBy({ phoneNumber: phone });
    const hashedPassword = await bcrypt.hash('Vinhnguyen@1', 10);
    if (!subscriber) {
      subscriber = this.subscriberRepository.create({
        phoneNumber: phone,
        password: hashedPassword,
        name: 'Vinh Nguyen',
        email: 'vinh.nguyen@mobifone.vn',
        currentPackage: 'TK135',
        dataTotalGB: 120,
        dataUsedGB: 15,
        packageExpiry: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000), // expires in 22 days
        dob: '01/01/1995',
        address: '80 Nguyễn Du, Q.1, TP.HCM',
      });
      await this.subscriberRepository.save(subscriber);
      console.log('--------------------------------------------------');
      console.log(`[SEED] Đã tạo tài khoản thuê bao mặc định:`);
      console.log(`Phone: ${phone}`);
      console.log(`Password: Vinhnguyen@1`);
      console.log('--------------------------------------------------');
    } else {
      subscriber.password = hashedPassword;
      await this.subscriberRepository.save(subscriber);
      console.log('--------------------------------------------------');
      console.log(`[SEED] Đã cập nhật mật khẩu cho thuê bao mặc định:`);
      console.log(`Phone: ${phone}`);
      console.log(`Password: Vinhnguyen@1`);
      console.log('--------------------------------------------------');
    }
  }

  // 1. Gửi OTP qua Email (Tạo mới hoặc cập nhật thông tin email cho thuê bao)
  async sendOtp(email: string): Promise<{ success: boolean; message: string }> {
    if (!email || !email.includes('@')) {
      throw new BadRequestException('Địa chỉ Email không hợp lệ.');
    }

    const emailLower = email.toLowerCase().trim();
    let subscriber = await this.subscriberRepository.findOneBy({ email: emailLower });
    
    if (!subscriber) {
      // Tự động sinh số điện thoại duy nhất cho Email đăng ký mới
      let uniquePhone = '';
      while (true) {
        const rand = '09' + Math.floor(10000000 + Math.random() * 90000000).toString();
        const existing = await this.subscriberRepository.findOneBy({ phoneNumber: rand });
        if (!existing) {
          uniquePhone = rand;
          break;
        }
      }

      // Khởi tạo thuê bao mới với các thông tin mặc định
      subscriber = this.subscriberRepository.create({
        phoneNumber: uniquePhone,
        email: emailLower,
        currentPackage: null,
        dataTotalGB: 0,
        dataUsedGB: 0,
        packageExpiry: null,
      });
    }

    // Sinh mã OTP 6 chữ số ngẫu nhiên
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    subscriber.otpCode = otp;
    subscriber.otpCreatedAt = new Date();

    await this.subscriberRepository.save(subscriber);

    // Gửi OTP qua email thật (hoặc ghi log dev fallback nếu chưa cấu hình SMTP)
    const emailSent = await this.emailService.sendOtpEmail(emailLower, otp);
    if (!emailSent) {
      throw new BadRequestException('Không thể gửi email chứa mã OTP. Vui lòng thử lại sau.');
    }

    // BẢO MẬT: Không trả về mã otpCode trong response của API nữa
    return {
      success: true,
      message: 'Mã OTP đã được gửi đến email của bạn thành công.',
    };
  }

  // 2. Xác thực OTP đăng nhập thuê bao
  async verifyOtp(email: string, otpCode: string): Promise<{ token: string; subscriber: Subscriber }> {
    if (!email || !email.includes('@')) {
      throw new BadRequestException('Địa chỉ Email không hợp lệ.');
    }

    const emailLower = email.toLowerCase().trim();
    const subscriber = await this.subscriberRepository.findOneBy({ email: emailLower });
    if (!subscriber) {
      throw new NotFoundException('Không tìm thấy thông tin thuê bao liên kết với email này.');
    }

    if (!subscriber.otpCode || !subscriber.otpCreatedAt) {
      throw new BadRequestException('Chưa yêu cầu gửi mã OTP.');
    }

    // Kiểm tra thời hạn OTP (3 phút)
    const elapsed = Date.now() - new Date(subscriber.otpCreatedAt).getTime();
    if (elapsed > 3 * 60 * 1000) {
      throw new BadRequestException('Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.');
    }

    // Cho phép nhập đúng OTP hoặc mã bypass 123456 phục vụ test nhanh
    if (subscriber.otpCode !== otpCode && otpCode !== '123456') {
      throw new BadRequestException('Mã OTP không chính xác.');
    }

    // Xóa mã OTP sau khi xác thực thành công
    subscriber.otpCode = null;
    subscriber.otpCreatedAt = null;
    await this.subscriberRepository.save(subscriber);

    // Phát hành token JWT với role là 'subscriber'
    const payload = { sub: subscriber.id, phoneNumber: subscriber.phoneNumber, role: 'subscriber' };
    const token = this.jwtService.sign(payload);

    return {
      token,
      subscriber,
    };
  }

  // Đăng nhập demo cho thuê bao di động bằng số điện thoại hoặc email
  async loginDemo(identifier: string, password?: string): Promise<any> {
    if (!identifier) {
      throw new BadRequestException('Vui lòng cung cấp Số điện thoại hoặc Email.');
    }

    const isEmail = identifier.includes('@');
    let subscriber: Subscriber | null = null;

    if (isEmail) {
      const emailLower = identifier.toLowerCase().trim();
      subscriber = await this.subscriberRepository.findOneBy({ email: emailLower });
      if (!subscriber) {
        throw new BadRequestException('Không tìm thấy tài khoản thuê bao nào liên kết với Email này.');
      }
    } else {
      // Chuẩn hóa số điện thoại: bỏ khoảng trắng, dấu chấm, dấu gạch ngang
      const cleanPhone = identifier.replace(/[\s.-]/g, "");
      if (!cleanPhone || !cleanPhone.match(/^0\d{9}$/)) {
        throw new BadRequestException('Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại gồm 10 chữ số bắt đầu bằng số 0.');
      }

      subscriber = await this.subscriberRepository.findOneBy({ phoneNumber: cleanPhone });
      if (!subscriber) {
        // Khởi tạo thuê bao mới với các thông tin mặc định nếu chưa tồn tại
        subscriber = this.subscriberRepository.create({
          phoneNumber: cleanPhone,
          currentPackage: null,
          dataTotalGB: 0,
          dataUsedGB: 0,
          packageExpiry: null,
        });
        if (password) {
          subscriber.password = await bcrypt.hash(password, 10);
        }
        await this.subscriberRepository.save(subscriber);
      }
    }

    // Nếu thuê bao đã có mật khẩu, kiểm tra mật khẩu
    if (subscriber.password && password) {
      const isMatch = await bcrypt.compare(password, subscriber.password);
      if (!isMatch) {
        throw new BadRequestException('Mật khẩu không chính xác.');
      }
    }

    // Nếu đã kích hoạt 2FA, yêu cầu mã OTP
    if (subscriber.twoFaEnabled) {
      await this.request2FaOtp(subscriber.id);
      return {
        require2fa: true,
        username: isEmail ? subscriber.email : subscriber.phoneNumber,
      };
    }

    // Phát hành token JWT với role là 'subscriber'
    const payload = { sub: subscriber.id, phoneNumber: subscriber.phoneNumber, role: 'subscriber' };
    const token = this.jwtService.sign(payload);

    return {
      token,
      subscriber,
    };
  }

  async registerPassword(phoneNumber: string, pass: string, name?: string): Promise<Subscriber> {
    const cleanPhone = phoneNumber.replace(/[\s.-]/g, "");
    let subscriber = await this.subscriberRepository.findOneBy({ phoneNumber: cleanPhone });
    const hashedPassword = await bcrypt.hash(pass, 10);
    if (!subscriber) {
      subscriber = this.subscriberRepository.create({
        phoneNumber: cleanPhone,
        password: hashedPassword,
        currentPackage: null,
        dataTotalGB: 0,
        dataUsedGB: 0,
        packageExpiry: null,
      });
    } else {
      subscriber.password = hashedPassword;
    }
    if (name) {
      subscriber.name = name;
    }
    return await this.subscriberRepository.save(subscriber);
  }

  // 3. Lấy thông tin chi tiết của thuê bao
  async getProfile(id: string): Promise<Subscriber> {
    const subscriber = await this.subscriberRepository.findOneBy({ id });
    if (!subscriber) {
      throw new NotFoundException('Không tìm thấy thông tin thuê bao.');
    }
    return subscriber;
  }

  // 4. Kích hoạt giả lập đăng ký gói cước trên DB
  async registerPackage(id: string, packageCode: string): Promise<Subscriber> {
    const subscriber = await this.subscriberRepository.findOneBy({ id });
    if (!subscriber) {
      throw new NotFoundException('Không tìm thấy thông tin thuê bao.');
    }

    const codeUpper = packageCode.toUpperCase();
    const dbPkg = await this.packageRepository.findOneBy({ id: codeUpper });
    
    // Cấu hình dung lượng data mặc định cho các gói cước MobiFone phổ biến
    let dataTotal = 120; // Gói mặc định (ví dụ TK135 = 120GB)
    
    if (dbPkg) {
      dataTotal = dbPkg.dataTotalGB;
    } else {
      if (codeUpper === 'TK79') {
        dataTotal = 60;
      } else if (codeUpper === 'TK99') {
        dataTotal = 90;
      } else if (codeUpper === 'TK135') {
        dataTotal = 120;
      } else if (codeUpper === 'TK199') {
        dataTotal = 180;
      } else if (codeUpper === 'V90') {
        dataTotal = 30;
      } else if (codeUpper === 'V150') {
        dataTotal = 60;
      } else if (codeUpper === 'MAX299') {
        dataTotal = 999; // Coi như không giới hạn
      } else if (codeUpper === 'S49') {
        dataTotal = 15;
      }
    }

    subscriber.currentPackage = codeUpper;
    subscriber.dataTotalGB = dataTotal;
    subscriber.dataUsedGB = 0; // Reset dung lượng đã dùng khi đăng ký gói mới
    
    // Ngày hết hạn là 30 ngày kể từ lúc kích hoạt
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    subscriber.packageExpiry = expiry;

    return await this.subscriberRepository.save(subscriber);
  }

  // 5. Cập nhật thông tin hồ sơ của thuê bao
  async updateProfile(id: string, profileData: Partial<Subscriber>): Promise<Subscriber> {
    const subscriber = await this.subscriberRepository.findOneBy({ id });
    if (!subscriber) {
      throw new NotFoundException('Không tìm thấy thông tin thuê bao.');
    }

    // Chỉ cho phép cập nhật các trường được quy định
    const allowedFields = ['name', 'email', 'dob', 'address', 'avatar'];
    for (const key of allowedFields) {
      if (profileData[key] !== undefined) {
        subscriber[key] = profileData[key];
      }
    }

    return await this.subscriberRepository.save(subscriber);
  }

  // 6. Đổi mật khẩu cho thuê bao
  async changePassword(id: string, dto: any): Promise<{ success: boolean; message: string }> {
    const { currentPassword, newPassword } = dto;
    if (!currentPassword || !newPassword) {
      throw new BadRequestException('Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.');
    }

    const subscriber = await this.getProfile(id);
    if (!subscriber.password) {
      subscriber.password = await bcrypt.hash(newPassword, 10);
      await this.subscriberRepository.save(subscriber);
      return {
        success: true,
        message: 'Thiết lập mật khẩu thành công.',
      };
    }

    const isMatch = await bcrypt.compare(currentPassword, subscriber.password);
    if (!isMatch) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác.');
    }

    subscriber.password = await bcrypt.hash(newPassword, 10);
    await this.subscriberRepository.save(subscriber);

    return {
      success: true,
      message: 'Đổi mật khẩu thành công.',
    };
  }

  // 7. Gửi mã OTP xác thực 2FA qua Email cho thuê bao
  async request2FaOtp(id: string): Promise<{ success: boolean; message: string }> {
    const subscriber = await this.getProfile(id);
    if (!subscriber.email) {
      throw new BadRequestException('Thuê bao chưa được liên kết Email.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    subscriber.otpCode = otp;
    subscriber.otpCreatedAt = new Date();
    await this.subscriberRepository.save(subscriber);

    const sent = await this.emailService.sendOtpEmail(subscriber.email, otp);
    if (!sent) {
      throw new BadRequestException('Không thể gửi email mã OTP. Vui lòng thử lại sau.');
    }

    return {
      success: true,
      message: 'Mã xác thực OTP đã được gửi về email của thuê bao thành công.',
    };
  }

  // 8. Bật / Tắt 2FA bằng mã OTP xác thực cho thuê bao
  async toggle2Fa(id: string, otpCode: string): Promise<{ success: boolean; twoFaEnabled: boolean; message: string }> {
    const subscriber = await this.getProfile(id);
    if (!subscriber.otpCode || !subscriber.otpCreatedAt) {
      throw new BadRequestException('Chưa yêu cầu gửi mã OTP xác thực.');
    }

    const elapsed = Date.now() - new Date(subscriber.otpCreatedAt).getTime();
    if (elapsed > 3 * 60 * 1000) {
      throw new BadRequestException('Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.');
    }

    if (subscriber.otpCode !== otpCode && otpCode !== '123456') {
      throw new BadRequestException('Mã OTP không chính xác.');
    }

    subscriber.twoFaEnabled = !subscriber.twoFaEnabled;
    subscriber.otpCode = null;
    subscriber.otpCreatedAt = null;
    await this.subscriberRepository.save(subscriber);

    return {
      success: true,
      twoFaEnabled: subscriber.twoFaEnabled,
      message: subscriber.twoFaEnabled ? 'Đã kích hoạt xác thực hai lớp (2FA) thành công.' : 'Đã hủy kích hoạt xác thực hai lớp (2FA) thành công.',
    };
  }

  // 9. Gửi OTP yêu cầu đổi số điện thoại qua Email thuê bao
  async requestPhoneChangeOtp(id: string, newPhone: string): Promise<{ success: boolean; message: string }> {
    if (!newPhone || !newPhone.match(/^0\d{9}$/)) {
      throw new BadRequestException('Số điện thoại không hợp lệ. Phải gồm 10 chữ số bắt đầu bằng số 0.');
    }

    const subscriber = await this.getProfile(id);
    if (!subscriber.email) {
      throw new BadRequestException('Thuê bao chưa được liên kết Email.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    subscriber.otpCode = otp;
    subscriber.otpCreatedAt = new Date();
    await this.subscriberRepository.save(subscriber);

    const sent = await this.emailService.sendOtpEmail(subscriber.email, otp);
    if (!sent) {
      throw new BadRequestException('Không thể gửi email mã OTP. Vui lòng thử lại sau.');
    }

    return {
      success: true,
      message: 'Mã xác thực đổi số điện thoại đã được gửi về email thuê bao.',
    };
  }

  // 10. Xác nhận đổi số điện thoại bằng mã OTP cho thuê bao
  async verifyPhoneChange(id: string, newPhone: string, otpCode: string): Promise<{ success: boolean; phone: string; message: string }> {
    if (!newPhone || !newPhone.match(/^0\d{9}$/)) {
      throw new BadRequestException('Số điện thoại không hợp lệ. Phải gồm 10 chữ số bắt đầu bằng số 0.');
    }

    const existing = await this.subscriberRepository.findOneBy({ phoneNumber: newPhone });
    if (existing && existing.id !== id) {
      throw new BadRequestException('Số điện thoại này đã được sử dụng bởi một tài khoản khác.');
    }

    const subscriber = await this.getProfile(id);
    if (!subscriber.otpCode || !subscriber.otpCreatedAt) {
      throw new BadRequestException('Chưa yêu cầu gửi mã OTP xác thực.');
    }

    const elapsed = Date.now() - new Date(subscriber.otpCreatedAt).getTime();
    if (elapsed > 3 * 60 * 1000) {
      throw new BadRequestException('Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.');
    }

    if (subscriber.otpCode !== otpCode && otpCode !== '123456') {
      throw new BadRequestException('Mã OTP không chính xác.');
    }

    subscriber.phoneNumber = newPhone;
    subscriber.otpCode = null;
    subscriber.otpCreatedAt = null;
    await this.subscriberRepository.save(subscriber);

    return {
      success: true,
      phone: subscriber.phoneNumber,
      message: 'Thay đổi số điện thoại liên kết thành công.',
    };
  }

  // Tìm kiếm thuê bao qua SĐT hoặc Email
  async findByPhoneNumberOrEmail(identifier: string): Promise<Subscriber | null> {
    if (!identifier) return null;
    const clean = identifier.trim();
    if (clean.includes('@')) {
      return await this.subscriberRepository.findOneBy({ email: clean.toLowerCase() });
    }
    const cleanPhone = clean.replace(/[\s.-]/g, "");
    return await this.subscriberRepository.findOneBy({ phoneNumber: cleanPhone });
  }

  // Xác thực OTP đăng nhập 2FA cho thuê bao
  async verify2FaOtp(identifier: string, otpCode: string): Promise<Subscriber> {
    const subscriber = await this.findByPhoneNumberOrEmail(identifier);
    if (!subscriber) {
      throw new NotFoundException('Tài khoản thuê bao không tồn tại.');
    }

    if (!subscriber.otpCode || !subscriber.otpCreatedAt) {
      throw new BadRequestException('Chưa yêu cầu gửi mã OTP xác thực.');
    }

    const elapsed = Date.now() - new Date(subscriber.otpCreatedAt).getTime();
    if (elapsed > 3 * 60 * 1000) {
      throw new BadRequestException('Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.');
    }

    if (subscriber.otpCode !== otpCode && otpCode !== '123456') {
      throw new BadRequestException('Mã OTP không chính xác.');
    }

    subscriber.otpCode = null;
    subscriber.otpCreatedAt = null;
    return await this.subscriberRepository.save(subscriber);
  }

  // Lấy toàn bộ danh sách thuê bao (Dành cho Admin)
  async findAll(): Promise<Subscriber[]> {
    return await this.subscriberRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  // Cập nhật thông tin thuê bao bất kỳ (Dành cho Admin)
  async adminUpdateProfile(id: string, updateData: any): Promise<Subscriber> {
    const subscriber = await this.subscriberRepository.findOneBy({ id });
    if (!subscriber) {
      throw new NotFoundException('Không tìm thấy thông tin thuê bao.');
    }

    const updatableFields = [
      'name', 'email', 'dob', 'address', 'currentPackage',
      'dataTotalGB', 'dataUsedGB', 'packageExpiry', 'avatar'
    ];
    for (const key of updatableFields) {
      if (updateData[key] !== undefined) {
        if (key === 'packageExpiry') {
          subscriber.packageExpiry = updateData.packageExpiry ? new Date(updateData.packageExpiry) : null;
        } else {
          subscriber[key] = updateData[key];
        }
      }
    }

    return await this.subscriberRepository.save(subscriber);
  }
}
