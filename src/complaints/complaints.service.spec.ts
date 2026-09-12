import { Test, TestingModule } from '@nestjs/testing';
import { ComplaintsService } from './complaints.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Role, ComplaintStatus, SensitivityLevel, Priority } from '../common/enums';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('ComplaintsService (Status, Transfers, Evidence & Resolution Workflows)', () => {
  let service: ComplaintsService;
  let prisma: any;
  let audit: any;

  const mockComplaint = {
    id: 'cmp-101',
    publicComplaintNumber: 'CMP-2026-000101',
    studentId: 'student-1',
    categoryId: 'cat-1',
    locationId: 'loc-1',
    departmentId: 'dept-cse',
    description: 'Broken laboratory equipment',
    priority: Priority.HIGH,
    confidentialityLevel: SensitivityLevel.NORMAL,
    status: ComplaintStatus.SUBMITTED,
    resolvedAt: null,
    closedAt: null,
    resolutionPhotoKey: null,
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
      complaint: {
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      complaintCategory: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      department: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      complaintStatusHistory: {
        create: jest.fn(),
      },
      complaintTransfer: {
        create: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    audit = {
      log: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplaintsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<ComplaintsService>(ComplaintsService);
  });

  describe('updateStatus & Evidence Enforcement', () => {
    it('should allow HOD to update status of departmental complaint', async () => {
      prisma.complaint.findUnique.mockResolvedValue(mockComplaint);
      prisma.department.findFirst.mockResolvedValue({ id: 'dept-cse', hodUserId: 'hod-1' });
      prisma.complaint.update.mockResolvedValue({ ...mockComplaint, status: ComplaintStatus.IN_PROGRESS });
      prisma.complaintStatusHistory.create.mockResolvedValue({ id: 'hist-1' });
      prisma.notification.create.mockResolvedValue({ id: 'notif-1' });

      const result = await service.updateStatus(
        'cmp-101',
        'hod-1',
        Role.HOD,
        { status: ComplaintStatus.IN_PROGRESS, reasonComment: 'Assigned to lab technician' },
      );

      expect(result.status).toBe(ComplaintStatus.IN_PROGRESS);
      expect(prisma.complaint.update).toHaveBeenCalled();
      expect(prisma.complaintStatusHistory.create).toHaveBeenCalled();
      expect(prisma.notification.create).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalled();
    });

    it('should enforce mandatory photo evidence when resolving a complaint', async () => {
      prisma.complaint.findUnique.mockResolvedValue(mockComplaint);
      prisma.department.findFirst.mockResolvedValue({ id: 'dept-cse', hodUserId: 'hod-1' });

      await expect(
        service.updateStatus('cmp-101', 'hod-1', Role.HOD, {
          status: ComplaintStatus.RESOLVED,
          reasonComment: 'Fixed with no evidence',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should succeed resolving when photo evidence key is provided', async () => {
      prisma.complaint.findUnique.mockResolvedValue(mockComplaint);
      prisma.department.findFirst.mockResolvedValue({ id: 'dept-cse', hodUserId: 'hod-1' });
      prisma.complaint.update.mockResolvedValue({
        ...mockComplaint,
        status: ComplaintStatus.RESOLVED,
        resolutionPhotoKey: 'uploads/evidence_photo_101.jpg',
      });

      const result = await service.updateStatus('cmp-101', 'hod-1', Role.HOD, {
        status: ComplaintStatus.RESOLVED,
        resolutionPhotoKey: 'uploads/evidence_photo_101.jpg',
        resolutionSummary: 'Culprit identified and lab equipment restored',
      });

      expect(result.status).toBe(ComplaintStatus.RESOLVED);
      expect(prisma.complaint.update).toHaveBeenCalled();
    });

    it('should reject status update if user has STUDENT role', async () => {
      await expect(
        service.updateStatus('cmp-101', 'student-1', Role.STUDENT, { status: ComplaintStatus.IN_PROGRESS }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('transfer', () => {
    it('should allow Principal to transfer complaint to another department', async () => {
      prisma.complaint.findUnique.mockResolvedValue(mockComplaint);
      prisma.department.findUnique.mockResolvedValue({
        id: 'dept-facilities',
        name: 'Campus Facilities & Maintenance',
        hodUserId: 'hod-facilities',
      });
      prisma.complaint.update.mockResolvedValue({
        ...mockComplaint,
        departmentId: 'dept-facilities',
        status: ComplaintStatus.UNDER_REVIEW,
      });

      const result = await service.transfer('cmp-101', 'principal-1', Role.PRINCIPAL, {
        destinationDepartmentId: 'dept-facilities',
        reason: 'Requires electrical facilities team',
      });

      expect(result.departmentId).toBe('dept-facilities');
      expect(prisma.complaintTransfer.create).toHaveBeenCalled();
      expect(prisma.notification.create).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalled();
    });

    it('should reject transfer attempt by STUDENT', async () => {
      await expect(
        service.transfer('cmp-101', 'student-1', Role.STUDENT, {
          destinationDepartmentId: 'dept-facilities',
          reason: 'Student attempting transfer',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject transfer attempt by HOD if complaint belongs to a different department', async () => {
      prisma.complaint.findUnique.mockResolvedValue(mockComplaint); // in dept-cse
      prisma.department.findFirst.mockResolvedValue({ id: 'dept-ece', hodUserId: 'hod-ece-1' }); // hod belongs to dept-ece

      await expect(
        service.transfer('cmp-101', 'hod-ece-1', Role.HOD, {
          destinationDepartmentId: 'dept-facilities',
          reason: 'Unauthorized HOD transfer attempt',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('confirmResolution', () => {
    it('should allow reporting student to close a RESOLVED complaint', async () => {
      const resolvedComplaint = { ...mockComplaint, status: ComplaintStatus.RESOLVED };
      prisma.complaint.findUnique.mockResolvedValue(resolvedComplaint);
      prisma.complaint.update.mockResolvedValue({ ...resolvedComplaint, status: ComplaintStatus.CLOSED });

      const result = await service.confirmResolution('cmp-101', 'student-1');
      expect(result.status).toBe(ComplaintStatus.CLOSED);
      expect(prisma.complaint.update).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalled();
    });
  });

  describe('reopen', () => {
    it('should allow reporting student to reopen a CLOSED complaint', async () => {
      const closedComplaint = { ...mockComplaint, status: ComplaintStatus.CLOSED };
      prisma.complaint.findUnique.mockResolvedValue(closedComplaint);
      prisma.complaint.update.mockResolvedValue({ ...closedComplaint, status: ComplaintStatus.REOPENED });

      const result = await service.reopen('cmp-101', 'student-1', { reason: 'Issue reoccurred after 2 days' });
      expect(result.status).toBe(ComplaintStatus.REOPENED);
      expect(prisma.complaint.update).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalled();
    });
  });

  describe('findOne & Role-Based Resource Isolation (ABAC/IDOR Protection)', () => {
    it('should allow student to access their own complaint', async () => {
      prisma.complaint.findUnique.mockResolvedValue(mockComplaint);
      const result = await service.findOne('cmp-101', 'student-1', Role.STUDENT);
      expect(result.id).toBe('cmp-101');
    });

    it('should block student from accessing another student complaint (IDOR Test)', async () => {
      prisma.complaint.findUnique.mockResolvedValue(mockComplaint);
      await expect(
        service.findOne('cmp-101', 'student-attacker-2', Role.STUDENT),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow HOD to access complaints in their own department', async () => {
      prisma.complaint.findUnique.mockResolvedValue(mockComplaint);
      prisma.department.findFirst.mockResolvedValue({ id: 'dept-cse', hodUserId: 'hod-cse-1' });

      const result = await service.findOne('cmp-101', 'hod-cse-1', Role.HOD);
      expect(result.id).toBe('cmp-101');
    });

    it('should block HOD from accessing another department complaint (HOD Isolation Test)', async () => {
      prisma.complaint.findUnique.mockResolvedValue(mockComplaint); // mockComplaint is in 'dept-cse'
      prisma.department.findFirst.mockResolvedValue({ id: 'dept-ece', hodUserId: 'hod-ece-1' }); // HOD is in 'dept-ece'

      await expect(
        service.findOne('cmp-101', 'hod-ece-1', Role.HOD),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow Principal global access to any complaint', async () => {
      prisma.complaint.findUnique.mockResolvedValue(mockComplaint);
      const result = await service.findOne('cmp-101', 'principal-1', Role.PRINCIPAL);
      expect(result.id).toBe('cmp-101');
    });
  });

  describe('getStatsForUser', () => {
    it('should compute real statistics and provide department breakdown for Principal', async () => {
      prisma.complaint.findMany.mockResolvedValue([mockComplaint]);
      prisma.department.findMany.mockResolvedValue([
        {
          id: 'dept-cse',
          name: 'Computer Science & Engineering',
          code: 'CSE',
        },
      ]);

      const stats = await service.getStatsForUser('principal-1', Role.PRINCIPAL);
      expect(stats.total).toBe(1);
      expect(stats.departmentsBreakdown).toHaveLength(1);
      expect(stats.departmentsBreakdown[0].name).toBe('Computer Science & Engineering');
    });
  });
});
