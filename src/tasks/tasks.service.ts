import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskStatusDto } from './dto/create-task.dto';
import { Role, TaskStatus } from '../common/enums';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string, role: Role, departmentId?: string) {
    const where: any = {};

    if (role === Role.PRINCIPAL || role === Role.ADMIN) {
      // Principal / Admin see all institutional tasks
    } else if (role === Role.HOD || role === Role.WOMEN_SAFETY_OFFICER) {
      // HOD sees department tasks or tasks assigned to them
      if (departmentId) {
        where.OR = [
          { departmentId },
          { assignedToUserId: userId },
          { createdByUserId: userId },
        ];
      } else {
        where.OR = [
          { assignedToUserId: userId },
          { createdByUserId: userId },
        ];
      }
    } else {
      // Staff / Student see tasks assigned to them
      where.assignedToUserId = userId;
    }

    return this.prisma.task.findMany({
      where,
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        complaint: {
          select: {
            id: true,
            publicComplaintNumber: true,
            status: true,
            priority: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        department: true,
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        complaint: {
          select: { id: true, publicComplaintNumber: true, status: true, priority: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async create(userId: string, dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        complaintId: dto.complaintId,
        departmentId: dto.departmentId,
        assignedToUserId: dto.assignedToUserId,
        createdByUserId: userId,
        priority: dto.priority || 'MEDIUM',
        status: TaskStatus.TODO,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      include: {
        department: true,
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }

  async updateStatus(id: string, userId: string, role: Role, dto: UpdateTaskStatusDto) {
    const task = await this.findOne(id);

    return this.prisma.task.update({
      where: { id },
      data: { status: dto.status as any },
      include: {
        department: true,
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }
}
