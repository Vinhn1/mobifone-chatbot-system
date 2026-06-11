import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './leads.entity';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>, // Nạp LeadRepository vào
  ) {}

  // 1. Lưu thông tin Lead mới
  async createLead(data: { name?: string; phone: string; interest?: string }): Promise<Lead> {
    const newLead = this.leadRepository.create(data); // Tạo instance mới của Entity
    return await this.leadRepository.save(newLead); // Lưu xuống Database
  }

  // 2. Lấy toàn bộ danh sách Leads cho trang quản trị Admin
  async getAllLeads(): Promise<Lead[]> {
    return await this.leadRepository.find({
      order: { createdAt: 'DESC' }, // Xếp dữ liệu mới đăng ký lên đầu
    });
  }

  // 3. Cập nhật trạng thái chăm sóc của Lead
  async updateLeadStatus(id: number, status: string): Promise<Lead> {
    const lead = await this.leadRepository.findOneBy({ id });
    if (!lead) {
      throw new Error('Không tìm thấy Khách hàng tiềm năng với ID đã cho.');
    }
    lead.status = status;
    return await this.leadRepository.save(lead);
  }
}
