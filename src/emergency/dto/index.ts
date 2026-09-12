import { IsOptional, IsNumber, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TriggerSosDto {
  @ApiPropertyOptional({ example: 12.9716, description: 'Latitude GPS coordinate' })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 77.5946, description: 'Longitude GPS coordinate' })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ example: 15.5, description: 'Accuracy in meters' })
  @IsNumber()
  @IsOptional()
  accuracyMeters?: number;

  @ApiPropertyOptional({ example: 'Sarojini Girls Hostel Lawn pathway', description: 'Additional location description or trigger note' })
  @IsString()
  @IsOptional()
  locationNote?: string;

  @ApiPropertyOptional({ example: 'Sarojini Girls Hostel Lawn pathway', description: 'Additional location description or trigger note' })
  @IsString()
  @IsOptional()
  locationDescription?: string;
}

export class AcknowledgeSosDto {
  @ApiPropertyOptional({ example: 'Campus security vehicle dispatched to location', description: 'Action taken by security responder' })
  @IsString()
  @IsOptional()
  actionTaken?: string;
}
