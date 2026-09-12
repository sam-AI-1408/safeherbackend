import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogDto {
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(dto: AuditLogDto): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: dto.actorUserId,
          action: dto.action,
          entityType: dto.entityType,
          entityId: dto.entityId,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
          metadata: dto.metadata ?? {},
        },
      });
      this.logger.log(`[AUDIT] Action: ${dto.action} | Entity: ${dto.entityType}:${dto.entityId ?? 'N/A'} | Actor: ${dto.actorUserId ?? 'ANONYMOUS'}`);
    } catch (error) {
      // Audit failure must be logged to stderr but not break active flow
      this.logger.error(`Failed to record audit log: ${error.message}`, error.stack);
    }
  }
}
