import { ForbiddenException } from '@nestjs/common';
import { AbacGuard, ComplaintAccessResource } from './abac.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, SensitivityLevel } from '../enums';

describe('AbacGuard (Mandatory Negative & Positive Authorization Tests)', () => {
  let guard: AbacGuard;
  const mockPrismaService = {} as PrismaService;

  beforeEach(() => {
    guard = new AbacGuard(mockPrismaService);
  });

  const normalCseComplaint: ComplaintAccessResource = {
    id: 'complaint-1',
    studentId: 'student-priya-1',
    departmentId: 'dept-cse',
    confidentialityLevel: SensitivityLevel.NORMAL,
    assignedTo: 'staff-suresh',
    isWomensSafety: false,
  };

  const confidentialHarassmentComplaint: ComplaintAccessResource = {
    id: 'complaint-2',
    studentId: 'student-priya-1',
    departmentId: 'dept-cse',
    confidentialityLevel: SensitivityLevel.CONFIDENTIAL,
    assignedTo: 'officer-meenakshi',
    isWomensSafety: true,
  };

  const restrictedAssaultComplaint: ComplaintAccessResource = {
    id: 'complaint-3',
    studentId: 'student-ananya-2',
    departmentId: 'dept-eee',
    confidentialityLevel: SensitivityLevel.RESTRICTED,
    assignedTo: 'officer-meenakshi',
    isWomensSafety: true,
  };

  describe('Student Authorization Scenarios', () => {
    it('STUDENT should be allowed to access their own submitted complaint', () => {
      const user = { userId: 'student-priya-1', role: Role.STUDENT };
      const canAccess = guard.evaluateComplaintAccess(user, normalCseComplaint);
      expect(canAccess).toBe(true);
    });

    it('STUDENT must be DENIED access when attempting to read another student complaint (Negative Test)', () => {
      const user = { userId: 'student-ananya-2', role: Role.STUDENT };
      expect(() =>
        guard.evaluateComplaintAccess(user, normalCseComplaint),
      ).toThrow(ForbiddenException);
    });
  });

  describe('HOD Authorization & Confidentiality Scenarios', () => {
    it('HOD should be allowed to access NORMAL complaint routed to their department', () => {
      const hodUser = {
        userId: 'hod-ramesh',
        role: Role.HOD,
        departmentId: 'dept-cse',
      };
      const canAccess = guard.evaluateComplaintAccess(hodUser, normalCseComplaint);
      expect(canAccess).toBe(true);
    });

    it('HOD must be STRICTLY DENIED access to CONFIDENTIAL women safety complaint even in their department (Negative Test)', () => {
      const hodUser = {
        userId: 'hod-ramesh',
        role: Role.HOD,
        departmentId: 'dept-cse',
      };
      expect(() =>
        guard.evaluateComplaintAccess(hodUser, confidentialHarassmentComplaint),
      ).toThrow(ForbiddenException);
    });

    it('HOD must be STRICTLY DENIED access to RESTRICTED women safety complaint (Negative Test)', () => {
      const hodUser = {
        userId: 'hod-ramesh',
        role: Role.HOD,
        departmentId: 'dept-cse',
      };
      expect(() =>
        guard.evaluateComplaintAccess(hodUser, restrictedAssaultComplaint),
      ).toThrow(ForbiddenException);
    });

    it('HOD must be DENIED access to normal complaint belonging to a DIFFERENT department (Negative Test)', () => {
      const hodUser = {
        userId: 'hod-ramesh',
        role: Role.HOD,
        departmentId: 'dept-cse',
      };
      const eeeComplaint = { ...normalCseComplaint, departmentId: 'dept-eee' };
      expect(() =>
        guard.evaluateComplaintAccess(hodUser, eeeComplaint),
      ).toThrow(ForbiddenException);
    });
  });

  describe('Women Safety Officer Authorization Scenarios', () => {
    it('WOMEN_SAFETY_OFFICER should be granted access to CONFIDENTIAL safety complaints', () => {
      const officerUser = {
        userId: 'officer-meenakshi',
        role: Role.WOMEN_SAFETY_OFFICER,
      };
      const canAccess = guard.evaluateComplaintAccess(
        officerUser,
        confidentialHarassmentComplaint,
      );
      expect(canAccess).toBe(true);
    });

    it('WOMEN_SAFETY_OFFICER should be granted access to RESTRICTED safety complaints', () => {
      const officerUser = {
        userId: 'officer-meenakshi',
        role: Role.WOMEN_SAFETY_OFFICER,
      };
      const canAccess = guard.evaluateComplaintAccess(
        officerUser,
        restrictedAssaultComplaint,
      );
      expect(canAccess).toBe(true);
    });
  });

  describe('Administrator Isolation & Blinding Scenarios', () => {
    it('ADMIN must be STRICTLY DENIED read access to complaint contents (Negative Test)', () => {
      const adminUser = { userId: 'admin-1', role: Role.ADMIN };
      expect(() =>
        guard.evaluateComplaintAccess(adminUser, normalCseComplaint),
      ).toThrow(ForbiddenException);
      expect(() =>
        guard.evaluateComplaintAccess(adminUser, confidentialHarassmentComplaint),
      ).toThrow(ForbiddenException);
    });
  });

  describe('Authorized Staff Assignment Scenarios', () => {
    it('AUTHORIZED_STAFF should be allowed to access complaint specifically assigned to them', () => {
      const staffUser = {
        userId: 'staff-suresh',
        role: Role.AUTHORIZED_STAFF,
      };
      const canAccess = guard.evaluateComplaintAccess(staffUser, normalCseComplaint);
      expect(canAccess).toBe(true);
    });

    it('AUTHORIZED_STAFF must be DENIED access to complaints NOT assigned to them (Negative Test)', () => {
      const unassignedStaff = {
        userId: 'staff-other-tech',
        role: Role.AUTHORIZED_STAFF,
      };
      expect(() =>
        guard.evaluateComplaintAccess(unassignedStaff, normalCseComplaint),
      ).toThrow(ForbiddenException);
    });
  });

  describe('Time-Bounded Case Access Grants', () => {
    it('User with active explicit CaseAccessGrant should be granted access', () => {
      const guestOfficer = {
        userId: 'external-committee-member',
        role: Role.HOD,
      };
      const canAccess = guard.evaluateComplaintAccess(
        guestOfficer,
        restrictedAssaultComplaint,
        true, // hasActiveGrant
      );
      expect(canAccess).toBe(true);
    });
  });
});
