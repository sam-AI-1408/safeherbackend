import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Campus Departments')
@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all active campus departments' })
  @ApiResponse({ status: 200, description: 'List of departments' })
  async findAll() {
    return this.departmentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department details by ID' })
  @ApiResponse({ status: 200, description: 'Department details' })
  async findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Get(':id/faculty')
  @ApiOperation({ summary: 'List active faculty members for assignment in this department' })
  @ApiResponse({ status: 200, description: 'List of faculty members' })
  async getFaculty(@Param('id') id: string) {
    return this.departmentsService.getFaculty(id);
  }
}
