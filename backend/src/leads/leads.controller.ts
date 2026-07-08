import { Controller, Post, Get, Patch, Param, Body, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'sales')
  async findAll() {
    return await this.leadsService.getAllLeads();
  }

  // PATCH /leads/:id/status - Cập nhật trạng thái chăm sóc
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'sales')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string }
  ) {
    if (!body.status) {
      throw new HttpException('Trạng thái là bắt buộc!', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.leadsService.updateLeadStatus(Number(id), body.status);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }
}

