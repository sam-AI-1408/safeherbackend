import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '../common/enums';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        complaint: {
          select: {
            id: true,
            publicComplaintNumber: true,
            status: true,
            priority: true,
          },
        },
      },
    });

    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return {
      notifications,
      unreadCount,
    };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { success: true };
  }

  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = NotificationType.SYSTEM,
    complaintId?: string,
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: type as any,
        complaintId,
        isRead: false,
      },
    });
  }
}
