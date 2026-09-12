import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskStatusDto } from './dto/create-task.dto';
import { CurrentUser, Roles } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/enums';

@ApiTags('Action Items & Tasks Management')
@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'List tasks filtered by user role and department' })
  @ApiResponse({ status: 200, description: 'List of authorized tasks' })
  async findAll(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: Role,
    @CurrentUser('departmentId') departmentId?: string,
  ) {
    return this.tasksService.findAllForUser(userId, role, departmentId);
  }

  @Post()
  @Roles(Role.HOD, Role.WOMEN_SAFETY_OFFICER, Role.PRINCIPAL, Role.ADMIN, Role.AUTHORIZED_STAFF)
  @ApiOperation({ summary: 'Create a new action item or task' })
  @ApiResponse({ status: 201, description: 'Task created' })
  async create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task details by ID' })
  @ApiResponse({ status: 200, description: 'Task details' })
  async findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update task workflow status (TODO, IN_PROGRESS, COMPLETED, CANCELLED)' })
  @ApiResponse({ status: 200, description: 'Task status updated' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: Role,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.tasksService.updateStatus(id, userId, role, dto);
  }
}
