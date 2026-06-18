import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './leads.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>, // Nạp LeadRepository vào
    private readonly notificationsService: NotificationsService,
  ) {}

  // 1. Lưu thông tin Lead mới
  async createLead(data: { name?: string; phone: string; interest?: string }): Promise<Lead> {
    const newLead = this.leadRepository.create(data); // Tạo instance mới của Entity
    const savedLead = await this.leadRepository.save(newLead); // Lưu xuống Database
    
    // Phát sự kiện realtime thông báo cho Admin Dashboard
    try {
      this.notificationsService.emitNotification('new-lead', savedLead);
    } catch (err) {
      console.error('Không thể phát sự kiện SSE new-lead:', err.message);
    }
    
    return savedLead;
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
