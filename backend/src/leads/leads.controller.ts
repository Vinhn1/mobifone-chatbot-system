import { Controller, Post, Get, Body, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('leads') // Định nghĩa route bắt đầu là /leads
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  // POST /leads - Tạo mới Lead
  @Post()
  async create(@Body() body: { name?: string; phone: string; interest?: string }) {
    if (!body.phone) {
      throw new HttpException('Số điện thoại là bắt buộc!', HttpStatus.BAD_REQUEST);
    }
    return await this.leadsService.createLead(body);
  }

  // GET /leads - Lấy danh sách (Admin Dashboard)
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll() {
    return await this.leadsService.getAllLeads();
  }
}

