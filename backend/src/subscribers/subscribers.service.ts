import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscriber } from './subscriber.entity';
import { Package } from './package.entity';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class SubscribersService {
  constructor(
    @InjectRepository(Subscriber)
    private readonly subscriberRepository: Repository<Subscriber>,
    @InjectRepository(Package)
    private readonly packageRepository: Repository<Package>,
    private readonly jwtService: JwtService,
  ) {}

  // 1. Gửi OTP giả lập (Tạo mới thuê bao nếu chưa có trong DB)
  async sendOtp(phoneNumber: string): Promise<{ success: boolean; message: string; otpCode: string }> {
    if (!phoneNumber || !phoneNumber.match(/^0\d{9}$/)) {
      throw new BadRequestException('Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại gồm 10 chữ số bắt đầu bằng số 0.');
    }

    let subscriber = await this.subscriberRepository.findOneBy({ phoneNumber });
    if (!subscriber) {
      // Khởi tạo thuê bao mới với các thông tin mặc định
      subscriber = this.subscriberRepository.create({
        phoneNumber,
        currentPackage: null,
        dataTotalGB: 0,
        dataUsedGB: 0,
        packageExpiry: null,
      });
    }

    // Sinh mã OTP 6 chữ số (mặc định 123456 cho sandbox, hoặc ngẫu nhiên)
    // Để tiện lợi kiểm thử, chúng ta sẽ sinh mã ngẫu nhiên nhưng cũng cho phép 123456
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    subscriber.otpCode = otp;
    subscriber.otpCreatedAt = new Date();

    await this.subscriberRepository.save(subscriber);

    // Trả về OTP trong response luôn để frontend hiển thị giả lập trên widget
    return {
      success: true,
      message: 'Mã OTP đã được gửi giả lập thành công.',
      otpCode: otp,
    };
  }

  // 2. Xác thực OTP đăng nhập thuê bao
  async verifyOtp(phoneNumber: string, otpCode: string): Promise<{ token: string; subscriber: Subscriber }> {
    const subscriber = await this.subscriberRepository.findOneBy({ phoneNumber });
    if (!subscriber) {
      throw new NotFoundException('Không tìm thấy thông tin thuê bao.');
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
    const allowedFields = ['name', 'email', 'dob', 'address'];
    for (const key of allowedFields) {
      if (profileData[key] !== undefined) {
        subscriber[key] = profileData[key];
      }
    }

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
      'dataTotalGB', 'dataUsedGB', 'packageExpiry'
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
