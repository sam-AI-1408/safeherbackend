import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TriggerSosDto, AcknowledgeSosDto } from './dto';
import { SosStatus } from '../common/enums';

@Injectable()
export class EmergencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async triggerSos(studentId: string, dto: TriggerSosDto, clientIp?: string, userAgent?: string) {
    const sosEvent = await this.prisma.emergencySosEvent.create({
      data: {
        studentId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracyMeters: dto.accuracyMeters,
        status: SosStatus.TRIGGERED,
      },
      include: {
        student: {
          select: { id: true, name: true, phone: true, email: true, department: true },
        },
      },
    });

    await this.auditService.log({
      actorUserId: studentId,
      action: 'EMERGENCY_SOS_TRIGGERED',
      entityType: 'EmergencySosEvent',
      entityId: sosEvent.id,
      ipAddress: clientIp,
      userAgent,
      metadata: { latitude: dto.latitude, longitude: dto.longitude },
    });

    return {
      message: 'Emergency SOS activated. Campus security and designated responders have been alerted.',
      sosEvent,
      emergencyDial: '+911122334455',
    };
  }

  async getActiveSosEvents() {
    return this.prisma.emergencySosEvent.findMany({
      where: {
        status: { in: [SosStatus.TRIGGERED, SosStatus.ACKNOWLEDGED] },
      },
      include: {
        student: {
          select: { id: true, name: true, phone: true, email: true, department: true },
        },
        responders: {
          include: {
            responder: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acknowledgeSos(eventId: string, responderUserId: string, dto: AcknowledgeSosDto, clientIp?: string) {
    const event = await this.prisma.emergencySosEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Emergency SOS event not found');
    }

    const responderRecord = await this.prisma.sosResponder.create({
      data: {
        sosEventId: eventId,
        responderUserId,
        acknowledgedAt: new Date(),
        actionTaken: dto.actionTaken || 'Responder acknowledged alert',
      },
    });

    await this.prisma.emergencySosEvent.update({
      where: { id: eventId },
      data: { status: SosStatus.ACKNOWLEDGED },
    });

    await this.auditService.log({
      actorUserId: responderUserId,
      action: 'EMERGENCY_SOS_ACKNOWLEDGED',
      entityType: 'EmergencySosEvent',
      entityId: eventId,
      ipAddress: clientIp,
      metadata: { actionTaken: dto.actionTaken },
    });

    return {
      message: 'SOS alert acknowledged',
      responderRecord,
    };
  }
}
