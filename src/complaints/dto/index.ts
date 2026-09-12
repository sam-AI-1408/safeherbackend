import { IsNotEmpty, IsString, IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority, SensitivityLevel, ComplaintStatus } from '../../common/enums';

export class CreateComplaintDto {
  @ApiProperty({ description: 'Category ID (e.g. Harassment, Stalking, Sanitation, Electrical)' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ description: 'Location ID (Building/Room/Zone)' })
  @IsString()
  @IsNotEmpty()
  locationId: string;

  @ApiProperty({ description: 'Detailed grievance or safety report description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Short summary or title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ enum: Priority, default: Priority.MEDIUM })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiPropertyOptional({ enum: SensitivityLevel, default: SensitivityLevel.NORMAL })
  @IsEnum(SensitivityLevel)
  @IsOptional()
  confidentialityLevel?: SensitivityLevel;

  @ApiPropertyOptional({ enum: SensitivityLevel, default: SensitivityLevel.NORMAL })
  @IsEnum(SensitivityLevel)
  @IsOptional()
  confidentiality?: SensitivityLevel;

  @ApiPropertyOptional({ description: 'Target department ID if applicable' })
  @IsString()
  @IsOptional()
  departmentId?: string;
}

export class UpdateComplaintStatusDto {
  @ApiProperty({ enum: ComplaintStatus, description: 'New complaint workflow status' })
  @IsEnum(ComplaintStatus)
  @IsNotEmpty()
  status: ComplaintStatus;

  @ApiPropertyOptional({ description: 'Action reason or internal status change note' })
  @IsString()
  @IsOptional()
  reasonComment?: string;

  @ApiPropertyOptional({ description: 'Resolution explanation / summary (Mandatory when resolving)' })
  @IsString()
  @IsOptional()
  resolutionSummary?: string;

  @ApiPropertyOptional({ description: 'Resolution photo / culprit proof attachment key (Mandatory when resolving)' })
  @IsString()
  @IsOptional()
  resolutionPhotoKey?: string;

  @ApiPropertyOptional({ description: 'Optional apology letter / disciplinary document attachment key' })
  @IsString()
  @IsOptional()
  resolutionApologyKey?: string;

  @ApiPropertyOptional({ description: 'Optional video proof attachment key' })
  @IsString()
  @IsOptional()
  resolutionVideoKey?: string;
}

export class AssignComplaintDto {
  @ApiProperty({ description: 'User ID of assigned staff technician or responder' })
  @IsString()
  @IsNotEmpty()
  assignedToUserId: string;

  @ApiPropertyOptional({ description: 'Instructions or assignment notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class TransferComplaintDto {
  @ApiProperty({ description: 'Destination Department ID' })
  @IsString()
  @IsNotEmpty()
  destinationDepartmentId: string;

  @ApiProperty({ description: 'Reason for transferring complaint to another department' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ReopenComplaintDto {
  @ApiProperty({ description: 'Reason for reopening unresolved grievance' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class SubmitFeedbackDto {
  @ApiProperty({ example: 5, description: 'Rating from 1 to 5' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Student resolution feedback comment' })
  @IsString()
  @IsOptional()
  comments?: string;
}
