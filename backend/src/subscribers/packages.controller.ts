import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Package } from './package.entity';

@Controller('packages')
export class PackagesController {
  constructor(
    @InjectRepository(Package)
    private readonly packageRepository: Repository<Package>,
  ) {}

  @Get()
  async getPackages() {
    let pkgs = await this.packageRepository.find({
      order: { id: 'ASC' }
    });

    // Tự động seed dữ liệu mặc định nếu bảng trống
    if (pkgs.length === 0) {
      console.log('[SEED] Bảng packages trống, đang nạp dữ liệu mặc định...');
      const defaultPkgs: Partial<Package>[] = [
        { id: 'TK79', name: 'TK79', price: '79.000đ', data: '2GB/ngày', voice: '30p/ngày', validity: '30 ngày', category: 'data', features: ['4G LTE', 'SMS miễn phí', 'MobiFone TV'], color: '#64748B', popular: false, dataTotalGB: 60, voiceTotalMin: 900 },
        { id: 'TK99', name: 'TK99', price: '99.000đ', data: '3GB/ngày', voice: 'Nội mạng miễn phí', validity: '30 ngày', category: 'data', features: ['5G Ready', 'SMS miễn phí', 'MobiFone TV'], color: '#0055A5', popular: false, dataTotalGB: 90, voiceTotalMin: 600 },
        { id: 'TK135', name: 'TK135', price: '135.000đ', data: '4GB/ngày', voice: 'Nội mạng miễn phí + 20p ngoại mạng', validity: '30 ngày', category: 'data', features: ['5G Ready', 'SMS miễn phí', 'MobiFone TV+', 'Cloud 5GB'], color: '#E4002B', popular: true, dataTotalGB: 120, voiceTotalMin: 620 },
        { id: 'TK199', name: 'TK199', price: '199.000đ', data: '6GB/ngày', voice: 'Tất cả mạng miễn phí', validity: '30 ngày', category: 'unlimited', features: ['5G Ultra', 'Roaming ASEAN', 'TV360 1 tháng', 'Cloud 20GB'], color: '#7C3AED', popular: false, dataTotalGB: 180, voiceTotalMin: 1000 },
        { id: 'V90', name: 'V90', price: '90.000đ', data: '1GB/ngày', voice: '1000p nội mạng', validity: '30 ngày', category: 'voice', features: ['4G LTE', 'SMS 500 tin'], color: '#059669', popular: false, dataTotalGB: 30, voiceTotalMin: 1000 },
        { id: 'V150', name: 'V150', price: '150.000đ', data: '2GB/ngày', voice: 'Không giới hạn nội mạng', validity: '30 ngày', category: 'voice', features: ['5G Ready', 'SMS 1000 tin', 'Gọi quốc tế -30%'], color: '#0284C7', popular: false, dataTotalGB: 60, voiceTotalMin: 1000 },
        { id: 'MAX299', name: 'MAX299', price: '299.000đ', data: 'Không giới hạn', voice: 'Tất cả mạng miễn phí', validity: '30 ngày', category: 'unlimited', features: ['5G Ultra', 'Roaming 10 nước', 'TV360', 'Cloud 50GB', 'Priority Support'], color: '#DC2626', popular: false, dataTotalGB: 999, voiceTotalMin: 2000 },
        { id: 'S49', name: 'S49', price: '49.000đ', data: '500MB/ngày', voice: '10p/ngày', validity: '30 ngày', category: 'data', features: ['4G LTE', 'Gói sinh viên'], color: '#4F46E5', popular: false, dataTotalGB: 15, voiceTotalMin: 300 }
      ];
      
      await this.packageRepository.save(defaultPkgs);
      pkgs = await this.packageRepository.find({
        order: { id: 'ASC' }
      });
    }

    return pkgs;
  }
}
