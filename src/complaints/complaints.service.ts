import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateComplaintDto, UpdateComplaintStatusDto, AssignComplaintDto, ReopenComplaintDto, SubmitFeedbackDto, TransferComplaintDto } from './dto';
import { Role, ComplaintStatus, SensitivityLevel, Priority, NotificationType } from '../common/enums';

@Injectable()
export class ComplaintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(studentId: string, dto: CreateComplaintDto, clientIp?: string, userAgent?: string) {
    // 1. Fetch category metadata to apply default priority & routing if not overridden
    const category = await this.prisma.complaintCategory.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Complaint category not found');
    }

    // 2. Resolve department if not specified
    let assignedDepartmentId = dto.departmentId;
    if (!assignedDepartmentId) {
      const student = await this.prisma.user.findUnique({
        where: { id: studentId },
        select: { departmentId: true },
      });
      if (student?.departmentId) {
        assignedDepartmentId = student.departmentId;
      }
    }

    // 3. Generate unique complaint tracking number (e.g. CMP-2026-000101)
    const count = await this.prisma.complaint.count();
    const year = new Date().getFullYear();
    const publicComplaintNumber = `CMP-${year}-${String(count + 1).padStart(6, '0')}`;

    // 4. Create complaint record
    const complaint = await this.prisma.complaint.create({
      data: {
        publicComplaintNumber,
        studentId,
        categoryId: dto.categoryId,
        locationId: dto.locationId,
        departmentId: assignedDepartmentId || undefined,
        description: dto.description.trim(),
        priority: dto.priority || category.defaultPriority || Priority.MEDIUM,
        confidentialityLevel: dto.confidentialityLevel || dto.confidentiality || category.sensitivityLevel || SensitivityLevel.NORMAL,
        status: ComplaintStatus.SUBMITTED,
      },
      include: {
        category: true,
        location: true,
        department: true,
        student: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // 5. Create initial status history entry
    await this.prisma.complaintStatusHistory.create({
      data: {
        complaintId: complaint.id,
        oldStatus: ComplaintStatus.SUBMITTED,
        newStatus: ComplaintStatus.SUBMITTED,
        changedByUserId: studentId,
        reasonComment: 'Complaint submitted by student via SafeHer portal',
      },
    });

    // 6. Create notification for student
    await this.prisma.notification.create({
      data: {
        userId: studentId,
        title: 'Complaint Registered Successfully',
        message: `Your grievance ${publicComplaintNumber} has been recorded and submitted for verification.`,
        type: NotificationType.COMPLAINT_CREATED as any,
        complaintId: complaint.id,
      },
    });

    // 7. Audit log
    await this.auditService.log({
      actorUserId: studentId,
      action: 'COMPLAINT_CREATED',
      entityType: 'Complaint',
      entityId: complaint.id,
      ipAddress: clientIp,
      userAgent,
      metadata: { complaintNumber: publicComplaintNumber, isWomensSafety: category.isWomensSafety },
    });

    return complaint;
  }

  async findAllForUser(userId: string, role: Role, departmentId?: string) {
    let whereClause: any = {};

    switch (role) {
      case Role.STUDENT:
        whereClause = { studentId: userId };
        break;

      case Role.HOD: {
        const hodDept = await this.prisma.department.findFirst({
          where: {
            OR: [
              { hodUserId: userId },
              ...(departmentId ? [{ id: departmentId }] : []),
            ],
          },
        });
        whereClause = {
          OR: [
            ...(hodDept ? [{ departmentId: hodDept.id }] : []),
            { department: { hodUserId: userId } },
            { departmentId: null },
          ],
          confidentialityLevel: { not: SensitivityLevel.RESTRICTED },
        };
        break;
      }

      case Role.WOMEN_SAFETY_OFFICER:
        whereClause = {
          OR: [
            { category: { isWomensSafety: true } },
            { confidentialityLevel: { in: [SensitivityLevel.CONFIDENTIAL, SensitivityLevel.RESTRICTED] } },
          ],
        };
        break;

      case Role.PRINCIPAL:
      case Role.ADMIN:
        whereClause = {};
        break;

      case Role.AUTHORIZED_STAFF:
        whereClause = {
          OR: [
            { assignedTo: userId },
            { departmentId },
          ],
        };
        break;
    }

    return this.prisma.complaint.findMany({
      where: whereClause,
      include: {
        category: true,
        location: true,
        department: true,
        student: {
          select: { id: true, name: true, email: true },
        },
        assignedUser: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStatsForUser(userId: string, role: Role, departmentId?: string) {
    const complaints = await this.findAllForUser(userId, role, departmentId);

    const total = complaints.length;
    const pending = complaints.filter(
      (c) =>
        c.status === ComplaintStatus.SUBMITTED ||
        c.status === ComplaintStatus.UNDER_REVIEW ||
        c.status === ComplaintStatus.ASSIGNED,
    ).length;
    const inProgress = complaints.filter((c) => c.status === ComplaintStatus.IN_PROGRESS).length;
    const resolved = complaints.filter((c) => c.status === ComplaintStatus.RESOLVED).length;
    const closed = complaints.filter((c) => c.status === ComplaintStatus.CLOSED).length;
    const rejected = complaints.filter((c) => c.status === ComplaintStatus.REJECTED).length;
    const reopened = complaints.filter((c) => c.status === ComplaintStatus.REOPENED).length;
    const critical = complaints.filter(
      (c) => c.priority === Priority.CRITICAL || c.priority === Priority.HIGH,
    ).length;
    const womensSafetyCount = complaints.filter((c) => c.category?.isWomensSafety).length;

    // Real department breakdown from database
    let departmentsBreakdown: any[] = [];
    if (role === Role.PRINCIPAL || role === Role.ADMIN) {
      const allDepartments = await this.prisma.department.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
      });

      departmentsBreakdown = allDepartments.map((dept) => {
        const deptComplaints = complaints.filter((c) => c.departmentId === dept.id);
        const deptTotal = deptComplaints.length;
        const deptActive = deptComplaints.filter(
          (c) =>
            c.status === ComplaintStatus.SUBMITTED ||
            c.status === ComplaintStatus.UNDER_REVIEW ||
            c.status === ComplaintStatus.ASSIGNED ||
            c.status === ComplaintStatus.IN_PROGRESS ||
            c.status === ComplaintStatus.REOPENED,
        ).length;
        const deptResolved = deptComplaints.filter((c) => c.status === ComplaintStatus.RESOLVED).length;
        const deptClosed = deptComplaints.filter((c) => c.status === ComplaintStatus.CLOSED).length;
        const deptReopened = deptComplaints.filter((c) => c.status === ComplaintStatus.REOPENED).length;

        return {
          departmentId: dept.id,
          name: dept.name,
          code: dept.code,
          total: deptTotal,
          active: deptActive,
          resolved: deptResolved,
          closed: deptClosed,
          reopened: deptReopened,
        };
      });
    }

    return {
      total,
      pending,
      inProgress,
      resolved,
      closed,
      rejected,
      reopened,
      critical,
      womensSafetyCount,
      departmentsBreakdown,
    };
  }

  async findOne(id: string, userId: string, role: Role, departmentId?: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
      include: {
        category: true,
        location: {
          include: { department: true },
        },
        department: {
          include: {
            hodUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            department: { select: { id: true, name: true, code: true } },
          },
        },
        assignedUser: {
          select: { id: true, name: true, email: true, role: true },
        },
        statusHistory: {
          include: {
            changedBy: {
              select: { id: true, name: true, role: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        transfers: {
          include: {
            sourceDepartment: { select: { id: true, name: true, code: true } },
            destinationDepartment: { select: { id: true, name: true, code: true } },
            transferredBy: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        attachments: {
          where: { isDeleted: false },
        },
        feedback: true,
      },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    // ABAC Security Check: Student can only access their own
    if (role === Role.STUDENT && complaint.studentId !== userId) {
      throw new ForbiddenException('You are not authorized to view this complaint');
    }

    // ABAC Security Check: HOD can only access their own department's complaints
    if (role === Role.HOD) {
      if (complaint.confidentialityLevel === SensitivityLevel.RESTRICTED) {
        throw new ForbiddenException('Restricted complaints can only be accessed by designated Women Safety Officers');
      }
      const hodDept = await this.prisma.department.findFirst({
        where: { hodUserId: userId },
      });
      if (complaint.departmentId && hodDept && complaint.departmentId !== hodDept.id) {
        throw new ForbiddenException('You are only authorized to view complaints assigned to your department');
      }
    }

    return complaint;
  }

  async updateStatus(id: string, userId: string, role: Role, dto: UpdateComplaintStatusDto, clientIp?: string) {
    if (role === Role.STUDENT) {
      throw new ForbiddenException('Students are not authorized to update administrative complaint status');
    }

    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
      include: { department: true },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');

    // HOD Scope Verification
    if (role === Role.HOD) {
      if (complaint.confidentialityLevel === SensitivityLevel.RESTRICTED) {
        throw new ForbiddenException('Restricted complaints can only be updated by designated Women Safety Officers');
      }
      const hodDept = await this.prisma.department.findFirst({
        where: { hodUserId: userId },
      });
      if (complaint.departmentId && hodDept && complaint.departmentId !== hodDept.id) {
        throw new ForbiddenException('You are only authorized to update complaints assigned to your department');
      }
    }

    // Mandatory Resolution Evidence Photo Check when transitioning to RESOLVED or CLOSED
    if (dto.status === ComplaintStatus.RESOLVED || dto.status === ComplaintStatus.CLOSED) {
      const hasPhoto = dto.resolutionPhotoKey || complaint.resolutionPhotoKey;
      if (!hasPhoto) {
        throw new BadRequestException('Mandatory evidence photo of incident/culprit resolution is required to mark complaint resolved');
      }
    }

    // Atomic Update via Prisma Transaction
    const [updated] = await this.prisma.$transaction([
      this.prisma.complaint.update({
        where: { id },
        data: {
          status: dto.status,
          resolvedAt: dto.status === ComplaintStatus.RESOLVED ? new Date() : complaint.resolvedAt,
          closedAt: dto.status === ComplaintStatus.CLOSED ? new Date() : complaint.closedAt,
          resolutionSummary: dto.resolutionSummary || complaint.resolutionSummary,
          resolutionPhotoKey: dto.resolutionPhotoKey || complaint.resolutionPhotoKey,
          resolutionApologyKey: dto.resolutionApologyKey || complaint.resolutionApologyKey,
          resolutionVideoKey: dto.resolutionVideoKey || complaint.resolutionVideoKey,
        },
        include: {
          category: true,
          location: true,
          department: true,
          student: { select: { id: true, name: true, email: true } },
          assignedUser: { select: { id: true, name: true, role: true } },
          statusHistory: {
            include: { changedBy: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'asc' },
          },
          transfers: {
            include: {
              sourceDepartment: true,
              destinationDepartment: true,
              transferredBy: { select: { id: true, name: true, role: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.complaintStatusHistory.create({
        data: {
          complaintId: id,
          oldStatus: complaint.status,
          newStatus: dto.status,
          changedByUserId: userId,
          reasonComment: dto.reasonComment || `Status changed from ${complaint.status} to ${dto.status}`,
        },
      }),
      this.prisma.notification.create({
        data: {
          userId: complaint.studentId,
          title: `Complaint Status: ${dto.status}`,
          message: `Your grievance ${complaint.publicComplaintNumber} status has been updated to ${dto.status}.`,
          type: (dto.status === ComplaintStatus.RESOLVED
            ? NotificationType.COMPLAINT_RESOLVED
            : dto.status === ComplaintStatus.CLOSED
            ? NotificationType.COMPLAINT_CLOSED
            : dto.status === ComplaintStatus.REJECTED
            ? NotificationType.COMPLAINT_REJECTED
            : NotificationType.COMPLAINT_STATUS_UPDATED) as any,
          complaintId: id,
        },
      }),
    ]);

    // Audit Log
    await this.auditService.log({
      actorUserId: userId,
      action: 'COMPLAINT_STATUS_UPDATED',
      entityType: 'Complaint',
      entityId: id,
      ipAddress: clientIp,
      metadata: { oldStatus: complaint.status, newStatus: dto.status, role },
    });

    return updated;
  }

  async transfer(id: string, userId: string, role: Role, dto: TransferComplaintDto, clientIp?: string) {
    if (role === Role.STUDENT) {
      throw new ForbiddenException('Students are not authorized to transfer complaints');
    }

    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
      include: { department: true },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');

    // HOD can only transfer from their own department
    if (role === Role.HOD) {
      const hodDept = await this.prisma.department.findFirst({
        where: { hodUserId: userId },
      });
      if (!hodDept || complaint.departmentId !== hodDept.id) {
        throw new ForbiddenException('You can only transfer complaints belonging to your department');
      }
    } else if (role !== Role.PRINCIPAL && role !== Role.ADMIN && role !== Role.WOMEN_SAFETY_OFFICER) {
      throw new ForbiddenException('Only authorized departmental or institutional authorities can transfer complaints');
    }

    if (complaint.departmentId === dto.destinationDepartmentId) {
      throw new BadRequestException('Complaint is already assigned to this department');
    }

    const destDept = await this.prisma.department.findUnique({
      where: { id: dto.destinationDepartmentId },
    });
    if (!destDept) throw new NotFoundException('Destination department not found');

    const [updated] = await this.prisma.$transaction([
      this.prisma.complaint.update({
        where: { id },
        data: {
          departmentId: dto.destinationDepartmentId,
          status: ComplaintStatus.UNDER_REVIEW,
        },
        include: {
          category: true,
          location: true,
          department: true,
          student: { select: { id: true, name: true, email: true } },
          statusHistory: {
            include: { changedBy: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'asc' },
          },
          transfers: {
            include: {
              sourceDepartment: true,
              destinationDepartment: true,
              transferredBy: { select: { id: true, name: true, role: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.complaintTransfer.create({
        data: {
          complaintId: id,
          sourceDepartmentId: complaint.departmentId,
          destinationDepartmentId: dto.destinationDepartmentId,
          transferredByUserId: userId,
          reason: dto.reason,
        },
      }),
      this.prisma.complaintStatusHistory.create({
        data: {
          complaintId: id,
          oldStatus: complaint.status,
          newStatus: ComplaintStatus.UNDER_REVIEW,
          changedByUserId: userId,
          reasonComment: `Transferred to ${destDept.name}. Reason: ${dto.reason}`,
        },
      }),
      this.prisma.notification.create({
        data: {
          userId: complaint.studentId,
          title: 'Complaint Transferred',
          message: `Your grievance ${complaint.publicComplaintNumber} has been reassigned to ${destDept.name} for resolution.`,
          type: NotificationType.COMPLAINT_TRANSFERRED as any,
          complaintId: id,
        },
      }),
    ]);

    // If destination department has an HOD, notify them
    if (destDept.hodUserId) {
      await this.prisma.notification.create({
        data: {
          userId: destDept.hodUserId,
          title: 'Case Transferred to Your Department',
          message: `Complaint ${complaint.publicComplaintNumber} has been transferred to ${destDept.name}. Reason: ${dto.reason}`,
          type: NotificationType.COMPLAINT_TRANSFERRED as any,
          complaintId: id,
        },
      });
    }

    await this.auditService.log({
      actorUserId: userId,
      action: 'COMPLAINT_TRANSFERRED',
      entityType: 'Complaint',
      entityId: id,
      ipAddress: clientIp,
      metadata: {
        fromDepartmentId: complaint.departmentId,
        toDepartmentId: dto.destinationDepartmentId,
        reason: dto.reason,
      },
    });

    return updated;
  }

  async confirmResolution(id: string, studentId: string, clientIp?: string) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id } });
    if (!complaint) throw new NotFoundException('Complaint not found');

    if (complaint.studentId !== studentId) {
      throw new ForbiddenException('Only the reporting student can confirm resolution');
    }

    if (complaint.status !== ComplaintStatus.RESOLVED) {
      throw new BadRequestException('Complaint must be in RESOLVED status before confirmation');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.complaint.update({
        where: { id },
        data: {
          status: ComplaintStatus.CLOSED,
          closedAt: new Date(),
        },
        include: {
          category: true,
          location: true,
          department: true,
          student: { select: { id: true, name: true, email: true } },
          statusHistory: {
            include: { changedBy: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.complaintStatusHistory.create({
        data: {
          complaintId: id,
          oldStatus: ComplaintStatus.RESOLVED,
          newStatus: ComplaintStatus.CLOSED,
          changedByUserId: studentId,
          reasonComment: 'Student confirmed resolution and closed the case',
        },
      }),
      this.prisma.notification.create({
        data: {
          userId: studentId,
          title: 'Grievance Case Closed',
          message: `Case ${complaint.publicComplaintNumber} has been confirmed resolved and formally closed.`,
          type: NotificationType.COMPLAINT_CLOSED as any,
          complaintId: id,
        },
      }),
    ]);

    await this.auditService.log({
      actorUserId: studentId,
      action: 'COMPLAINT_RESOLVED_CONFIRMED',
      entityType: 'Complaint',
      entityId: id,
      ipAddress: clientIp,
    });

    return updated;
  }

  async reopen(id: string, studentId: string, dto: ReopenComplaintDto, clientIp?: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
      include: { department: true },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');

    if (complaint.studentId !== studentId) {
      throw new ForbiddenException('Only the reporting student can reopen a complaint');
    }

    if (
      complaint.status !== ComplaintStatus.CLOSED &&
      complaint.status !== ComplaintStatus.REJECTED &&
      complaint.status !== ComplaintStatus.RESOLVED
    ) {
      throw new BadRequestException('Only closed, rejected, or resolved complaints can be reopened');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.complaint.update({
        where: { id },
        data: {
          status: ComplaintStatus.REOPENED,
        },
        include: {
          category: true,
          location: true,
          department: true,
          student: { select: { id: true, name: true, email: true } },
          statusHistory: {
            include: { changedBy: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.complaintStatusHistory.create({
        data: {
          complaintId: id,
          oldStatus: complaint.status,
          newStatus: ComplaintStatus.REOPENED,
          changedByUserId: studentId,
          reasonComment: dto?.reason ? `Student reopened complaint: ${dto.reason}` : 'Student reopened complaint for review',
        },
      }),
      this.prisma.notification.create({
        data: {
          userId: studentId,
          title: 'Complaint Reopened',
          message: `Your grievance ${complaint.publicComplaintNumber} has been reopened for departmental review.`,
          type: NotificationType.COMPLAINT_REOPENED as any,
          complaintId: id,
        },
      }),
    ]);

    // Notify HOD if department exists
    if (complaint.department?.hodUserId) {
      await this.prisma.notification.create({
        data: {
          userId: complaint.department.hodUserId,
          title: 'Reopened Grievance Alert',
          message: `Complaint ${complaint.publicComplaintNumber} has been reopened by the student. Reason: ${dto?.reason || 'Unresolved issues'}`,
          type: NotificationType.COMPLAINT_REOPENED as any,
          complaintId: id,
        },
      });
    }

    await this.auditService.log({
      actorUserId: studentId,
      action: 'COMPLAINT_REOPENED',
      entityType: 'Complaint',
      entityId: id,
      ipAddress: clientIp,
      metadata: { reason: dto?.reason },
    });

    return updated;
  }

  async submitFeedback(id: string, studentId: string, dto: SubmitFeedbackDto, clientIp?: string) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id } });
    if (!complaint) throw new NotFoundException('Complaint not found');

    if (complaint.studentId !== studentId) {
      throw new ForbiddenException('Only the reporting student can submit feedback');
    }

    const feedback = await this.prisma.feedback.create({
      data: {
        complaintId: id,
        studentId,
        rating: dto.rating,
        comments: dto.comments,
      },
    });

    await this.auditService.log({
      actorUserId: studentId,
      action: 'FEEDBACK_SUBMITTED',
      entityType: 'Feedback',
      entityId: feedback.id,
      ipAddress: clientIp,
      metadata: { rating: dto.rating },
    });

    return feedback;
  }

  async assign(id: string, assignedByUserId: string, dto: AssignComplaintDto, clientIp?: string) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id } });
    if (!complaint) throw new NotFoundException('Complaint not found');

    await this.prisma.complaintAssignment.create({
      data: {
        complaintId: id,
        assignedByUserId,
        assignedToUserId: dto.assignedToUserId,
        notes: dto.notes,
      },
    });

    const updated = await this.prisma.complaint.update({
      where: { id },
      data: {
        assignedTo: dto.assignedToUserId,
        status: ComplaintStatus.ASSIGNED,
      },
      include: {
        assignedUser: { select: { id: true, name: true, role: true } },
      },
    });

    // Notify assigned user
    await this.prisma.notification.create({
      data: {
        userId: dto.assignedToUserId,
        title: 'New Complaint Assigned',
        message: `You have been assigned to handle complaint ${complaint.publicComplaintNumber}.`,
        type: NotificationType.COMPLAINT_ASSIGNED as any,
        complaintId: id,
      },
    });

    await this.auditService.log({
      actorUserId: assignedByUserId,
      action: 'COMPLAINT_ASSIGNED',
      entityType: 'Complaint',
      entityId: id,
      ipAddress: clientIp,
      metadata: { assignedTo: dto.assignedToUserId },
    });

    return updated;
  }

  async getCategories() {
    return this.prisma.complaintCategory.findMany({
      orderBy: [{ isWomensSafety: 'desc' }, { name: 'asc' }],
    });
  }

  async getLocations() {
    return this.prisma.location.findMany({
      include: { department: true },
      orderBy: [{ building: 'asc' }, { roomIdentifier: 'asc' }],
    });
  }
}
