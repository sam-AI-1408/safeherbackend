import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SafetyResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllActiveResources() {
    return this.prisma.safetyResource.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getEmergencyContacts() {
    return this.prisma.emergencyContact.findMany({
      where: { isActive: true },
      orderBy: { priorityOrder: 'asc' },
    });
  }
}
