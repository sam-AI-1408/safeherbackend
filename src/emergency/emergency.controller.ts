import { Controller, Post, Get, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { EmergencyService } from './emergency.service';
import { TriggerSosDto, AcknowledgeSosDto } from './dto';
import { CurrentUser, Roles } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/enums';

@ApiTags('Emergency & Safety SOS')
@Controller('emergency')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

  @Post('sos')
  @ApiOperation({ summary: 'Trigger instant emergency SOS distress signal' })
  @ApiResponse({ status: 201, description: 'SOS triggered and dispatched to campus responders' })
  async triggerSos(
    @CurrentUser('userId') userId: string,
    @Body() dto: TriggerSosDto,
    @Req() req: Request,
  ) {
    const clientIp = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.emergencyService.triggerSos(userId, dto, clientIp, userAgent);
  }

  @Get('active')
  @Roles(Role.PRINCIPAL, Role.HOD, Role.WOMEN_SAFETY_OFFICER, Role.SECURITY, Role.AUTHORIZED_STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'View active SOS emergency distress events (Responders & Authorities)' })
  @ApiResponse({ status: 200, description: 'List of active emergency distress events' })
  async getActiveEvents() {
    return this.emergencyService.getActiveSosEvents();
  }

  @Patch('sos/:id/acknowledge')
  @Roles(Role.PRINCIPAL, Role.HOD, Role.WOMEN_SAFETY_OFFICER, Role.SECURITY, Role.AUTHORIZED_STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Acknowledge an active SOS event and log response action' })
  @ApiResponse({ status: 200, description: 'SOS acknowledged by authorized responder' })
  async acknowledgeSos(
    @Param('id') eventId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: AcknowledgeSosDto,
    @Req() req: Request,
  ) {
    const clientIp = req.ip || req.socket.remoteAddress;
    return this.emergencyService.acknowledgeSos(eventId, userId, dto, clientIp);
  }

  @Patch('sos/:id/resolve')
  @Roles(Role.PRINCIPAL, Role.HOD, Role.WOMEN_SAFETY_OFFICER, Role.SECURITY, Role.AUTHORIZED_STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Resolve an emergency distress incident with notes' })
  @ApiResponse({ status: 200, description: 'SOS incident resolved' })
  async resolveSos(
    @Param('id') eventId: string,
    @CurrentUser('userId') userId: string,
    @Body() body: { notes?: string },
    @Req() req: Request,
  ) {
    const clientIp = req.ip || req.socket.remoteAddress;
    return this.emergencyService.resolveSos(eventId, userId, body?.notes, clientIp);
  }

  @Get('history')
  @Roles(Role.PRINCIPAL, Role.HOD, Role.WOMEN_SAFETY_OFFICER, Role.SECURITY, Role.AUTHORIZED_STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'List historical SOS emergency incidents' })
  @ApiResponse({ status: 200, description: 'Historical emergency incidents' })
  async getHistory() {
    return this.emergencyService.getSosHistory();
  }
}
