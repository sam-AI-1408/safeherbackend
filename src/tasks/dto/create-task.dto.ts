import { IsNotEmpty, IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority, TaskStatus } from '../../common/enums';

export class CreateTaskDto {
  @ApiProperty({ description: 'Task title or action item description' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Detailed action item instructions' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Associated complaint ID' })
  @IsString()
  @IsOptional()
  complaintId?: string;

  @ApiPropertyOptional({ description: 'Associated department ID' })
  @IsString()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Assigned staff or responder user ID' })
  @IsString()
  @IsOptional()
  assignedToUserId?: string;

  @ApiPropertyOptional({ enum: Priority, default: Priority.MEDIUM })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiPropertyOptional({ description: 'Target completion due date (ISO string)' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;
}

export class UpdateTaskStatusDto {
  @ApiProperty({ enum: TaskStatus, description: 'Updated task workflow status' })
  @IsEnum(TaskStatus)
  @IsNotEmpty()
  status: TaskStatus;
}
