import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, SensitivityLevel } from '../enums';

export interface AbacContext {
  userId: string;
  role: Role;
  departmentId?: string;
}

export interface ComplaintAccessResource {
  id: string;
  studentId: string;
  departmentId?: string;
  confidentialityLevel: SensitivityLevel;
  assignedTo?: string;
  isWomensSafety?: boolean;
}

@Injectable()
export class AbacGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const complaintId = request.params?.id;

    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    // If route doesn't have a specific complaint ID parameter, basic role check passes
    if (!complaintId) {
      return true;
    }

    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        category: true,
        accessGrants: {
          where: {
            grantedToUserId: user.userId,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
        },
      },
    });

    if (!complaint) {
      throw new NotFoundException(`Complaint with ID ${complaintId} not found`);
    }

    return this.evaluateComplaintAccess(user, {
      id: complaint.id,
      studentId: complaint.studentId,
      departmentId: complaint.departmentId || undefined,
      confidentialityLevel: complaint.confidentialityLevel as SensitivityLevel,
      assignedTo: complaint.assignedTo || undefined,
      isWomensSafety: complaint.category?.isWomensSafety,
    }, complaint.accessGrants?.length > 0);
  }

  evaluateComplaintAccess(
    user: { userId: string; role: Role; departmentId?: string },
    resource: ComplaintAccessResource,
    hasActiveGrant: boolean = false,
  ): boolean {
    const { userId, role, departmentId } = user;

    // 1. Time-bounded explicit grant check
    if (hasActiveGrant) {
      return true;
    }

    // 2. Student Role: Only allow access to their own complaints
    if (role === Role.STUDENT) {
      if (resource.studentId !== userId) {
        throw new ForbiddenException('Access denied. You can only access your own submitted complaints.');
      }
      return true;
    }

    // 3. Admin Role: Blinded from direct case content
    if (role === Role.ADMIN) {
      throw new ForbiddenException('Access denied. System Administrators do not have read access to complaint contents.');
    }

    // 4. Women Safety Officer: Access to all CONFIDENTIAL and RESTRICTED women safety cases
    if (role === Role.WOMEN_SAFETY_OFFICER) {
      if (
        resource.confidentialityLevel === SensitivityLevel.CONFIDENTIAL ||
        resource.confidentialityLevel === SensitivityLevel.RESTRICTED ||
        resource.isWomensSafety
      ) {
        return true;
      }
      // Can also view normal complaints if needed for general grievance oversight
      return true;
    }

    // 5. HOD Role: Can ONLY view non-confidential (NORMAL) complaints belonging strictly to their department
    if (role === Role.HOD) {
      if (
        resource.confidentialityLevel === SensitivityLevel.CONFIDENTIAL ||
        resource.confidentialityLevel === SensitivityLevel.RESTRICTED
      ) {
        throw new ForbiddenException(
          'Access denied. Confidential and restricted safety complaints cannot be accessed by Department HOD.',
        );
      }

      if (resource.departmentId && departmentId && resource.departmentId !== departmentId) {
        throw new ForbiddenException(
          'Access denied. You can only view complaints routed to your assigned department.',
        );
      }

      return true;
    }

    // 6. Authorized Staff: Can only view complaints explicitly assigned to them
    if (role === Role.AUTHORIZED_STAFF) {
      if (resource.assignedTo !== userId) {
        throw new ForbiddenException(
          'Access denied. You are only authorized to access complaints specifically assigned to you.',
        );
      }
      return true;
    }

    // 7. Principal: Allowed oversight access
    if (role === Role.PRINCIPAL) {
      return true;
    }

    throw new ForbiddenException('Access denied by authorization policy.');
  }
}
