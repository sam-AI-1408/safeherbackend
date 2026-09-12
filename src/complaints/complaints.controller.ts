import { Controller, Post, Get, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto, UpdateComplaintStatusDto, AssignComplaintDto, TransferComplaintDto, ReopenComplaintDto, SubmitFeedbackDto } from './dto';
import { CurrentUser, Roles } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/enums';

@ApiTags('Grievance & Complaints Management')
@Controller('complaints')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post()
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Submit a new grievance or safety concern (Student)' })
  @ApiResponse({ status: 201, description: 'Complaint created and tracking number issued' })
  async create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateComplaintDto,
    @Req() req: Request,
  ) {
    const clientIp = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.complaintsService.create(userId, dto, clientIp, userAgent);
  }

  @Get()
  @ApiOperation({ summary: 'Get complaints filtered by user role and ABAC permissions' })
  @ApiResponse({ status: 200, description: 'List of authorized complaints' })
  async findAll(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: Role,
    @CurrentUser('departmentId') departmentId?: string,
  ) {
    return this.complaintsService.findAllForUser(userId, role, departmentId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get overview metrics & statistics for current user dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics' })
  async getStats(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: Role,
    @CurrentUser('departmentId') departmentId?: string,
  ) {
    return this.complaintsService.getStatsForUser(userId, role, departmentId);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List all active complaint categories' })
  @ApiResponse({ status: 200, description: 'Categories list' })
  async getCategories() {
    return this.complaintsService.getCategories();
  }

  @Get('locations')
  @ApiOperation({ summary: 'List campus locations with building/room details' })
  @ApiResponse({ status: 200, description: 'Locations list' })
  async getLocations() {
    return this.complaintsService.getLocations();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get detailed complaint record with status history and internal notes' })
  @ApiResponse({ status: 200, description: 'Detailed complaint record' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: Role,
    @CurrentUser('departmentId') departmentId?: string,
  ) {
    return this.complaintsService.findOne(id, userId, role, departmentId);
  }

  @Patch(':id/status')
  @Roles(Role.HOD, Role.WOMEN_SAFETY_OFFICER, Role.PRINCIPAL, Role.AUTHORIZED_STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Update complaint status in resolution workflow (PATCH)' })
  @ApiResponse({ status: 200, description: 'Complaint status updated' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: Role,
    @Body() dto: UpdateComplaintStatusDto,
    @Req() req: Request,
  ) {
    const clientIp = req.ip || req.socket.remoteAddress;
    return this.complaintsService.updateStatus(id, userId, role, dto, clientIp);
  }

  @Post(':id/status')
  @Roles(Role.HOD, Role.WOMEN_SAFETY_OFFICER, Role.PRINCIPAL, Role.AUTHORIZED_STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Update complaint status in resolution workflow (POST alias)' })
  @ApiResponse({ status: 200, description: 'Complaint status updated' })
  async updateStatusPost(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: Role,
    @Body() dto: UpdateComplaintStatusDto,
    @Req() req: Request,
  ) {
    const clientIp = req.ip || req.socket.remoteAddress;
    return this.complaintsService.updateStatus(id, userId, role, dto, clientIp);
  }

  @Post(':id/transfer')
  @Roles(Role.HOD, Role.PRINCIPAL, Role.ADMIN, Role.WOMEN_SAFETY_OFFICER)
  @ApiOperation({ summary: 'Transfer complaint to another department (HOD/Principal/Admin)' })
  @ApiResponse({ status: 200, description: 'Complaint reassigned to target department' })
  async transfer(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: Role,
    @Body() dto: TransferComplaintDto,
    @Req() req: Request,
  ) {
    const clientIp = req.ip || req.socket.remoteAddress;
    return this.complaintsService.transfer(id, userId, role, dto, clientIp);
  }

  @Post(':id/confirm-resolution')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Confirm resolution and close complaint (Student)' })
  @ApiResponse({ status: 200, description: 'Complaint marked as closed' })
  async confirmResolution(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Req() req: Request,
  ) {
    const clientIp = req.ip || req.socket.remoteAddress;
    return this.complaintsService.confirmResolution(id, userId, clientIp);
  }

  @Post(':id/reopen')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Reopen unresolved complaint (Student)' })
  @ApiResponse({ status: 200, description: 'Complaint reopened' })
  async reopen(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: ReopenComplaintDto,
    @Req() req: Request,
  ) {
    const clientIp = req.ip || req.socket.remoteAddress;
    return this.complaintsService.reopen(id, userId, dto, clientIp);
  }

  @Post(':id/feedback')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Submit satisfaction rating & feedback (Student)' })
  @ApiResponse({ status: 201, description: 'Feedback submitted' })
  async submitFeedback(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: SubmitFeedbackDto,
    @Req() req: Request,
  ) {
    const clientIp = req.ip || req.socket.remoteAddress;
    return this.complaintsService.submitFeedback(id, userId, dto, clientIp);
  }

  @Post(':id/assign')
  @Roles(Role.HOD, Role.WOMEN_SAFETY_OFFICER, Role.PRINCIPAL, Role.ADMIN)
  @ApiOperation({ summary: 'Assign complaint to an authorized responder or technician' })
  @ApiResponse({ status: 200, description: 'Complaint assigned' })
  async assign(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: AssignComplaintDto,
    @Req() req: Request,
  ) {
    const clientIp = req.ip || req.socket.remoteAddress;
    return this.complaintsService.assign(id, userId, dto, clientIp);
  }
}
