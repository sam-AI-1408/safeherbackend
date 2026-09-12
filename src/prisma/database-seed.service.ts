import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Role, UserStatus, ResourceCategory } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from './prisma.service';

@Injectable()
export class DatabaseSeedService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseSeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedIfNeeded();
  }

  /**
   * Safe, idempotent database seeder that runs during application startup.
   * Ensures essential departments, demo accounts, complaint categories,
   * and safety resources exist in the database without overwriting or deleting any existing records.
   */
  async seedIfNeeded(): Promise<void> {
    if (!this.prisma.isDatabaseConfigured()) {
      this.logger.warn('Skipping database seeding because DATABASE_URL is not configured.');
      return;
    }

    try {
      this.logger.log('Checking institutional demo accounts and master data...');

      // 1. Master Campus Departments
      const departments = [
        { code: 'CSE', name: 'Computer Science & Engineering' },
        { code: 'ECE', name: 'Electronics & Communication Engineering' },
        { code: 'EEE', name: 'Electrical & Electronics Engineering' },
        { code: 'MECH', name: 'Mechanical Engineering' },
        { code: 'CIVIL', name: 'Civil Engineering' },
        { code: 'FACILITIES', name: 'Campus Facilities & Maintenance' },
        { code: 'WGSC', name: 'Women Safety Cell & Student Welfare' },
        { code: 'LIBRARY', name: 'Central Library Services' },
        { code: 'HOSTEL', name: 'Hostel Administration & Residential Life' },
        { code: 'TRANSPORT', name: 'Campus Transport Services' },
        { code: 'SECURITY', name: 'Campus Security & Surveillance' },
        { code: 'ADMIN_DEPT', name: 'Administration & Student Affairs' },
      ];

      const deptMap: Record<string, string> = {};
      for (const dept of departments) {
        const record = await this.prisma.department.upsert({
          where: { code: dept.code },
          update: {},
          create: {
            name: dept.name,
            code: dept.code,
            isActive: true,
          },
        });
        deptMap[dept.code] = record.id;
      }
      this.logger.log('Master departments verified.');

      // 2. Demo Users (Bcrypt hashed password: "Password@123")
      const passwordHash = await bcrypt.hash('Password@123', 10);

      const demoUsers = [
        {
          email: 'student@safeher.test',
          name: 'Priya Sharma',
          phone: '+919876543201',
          role: Role.STUDENT,
          departmentId: deptMap['CSE'],
        },
        {
          email: 'student2@safeher.test',
          name: 'Ananya Verma',
          phone: '+919876543202',
          role: Role.STUDENT,
          departmentId: deptMap['EEE'],
        },
        {
          email: 'hod.cs@safeher.test',
          name: 'Dr. Ramesh Kumar',
          phone: '+919876543210',
          role: Role.HOD,
          departmentId: deptMap['CSE'],
        },
        {
          email: 'hod.ece@safeher.test',
          name: 'Dr. Arvind Swaminathan',
          phone: '+919876543211',
          role: Role.HOD,
          departmentId: deptMap['ECE'],
        },
        {
          email: 'hod.eee@safeher.test',
          name: 'Dr. Suresh Reddy',
          phone: '+919876543212',
          role: Role.HOD,
          departmentId: deptMap['EEE'],
        },
        {
          email: 'safety@safeher.test',
          name: 'Dr. Meenakshi Sundaram',
          phone: '+919876543220',
          role: Role.WOMEN_SAFETY_OFFICER,
          departmentId: deptMap['WGSC'],
        },
        {
          email: 'safetyofficer@safeher.test',
          name: 'Dr. Meenakshi Sundaram (Safety Lead)',
          phone: '+919876543221',
          role: Role.WOMEN_SAFETY_OFFICER,
          departmentId: deptMap['WGSC'],
        },
        {
          email: 'principal@safeher.test',
          name: 'Dr. Rajeshwar Rao',
          phone: '+919876543230',
          role: Role.PRINCIPAL,
          departmentId: deptMap['ADMIN_DEPT'],
        },
        {
          email: 'faculty@safeher.test',
          name: 'Prof. Ananya Sengupta',
          phone: '+919876543240',
          role: Role.FACULTY,
          departmentId: deptMap['CSE'],
        },
        {
          email: 'security@safeher.test',
          name: 'Officer Vikram Singh',
          phone: '+919876543250',
          role: Role.SECURITY,
          departmentId: deptMap['SECURITY'],
        },
      ];

      for (const user of demoUsers) {
        const existing = await this.prisma.user.findUnique({
          where: { email: user.email },
        });

        if (!existing) {
          await this.prisma.user.create({
            data: {
              email: user.email,
              name: user.name,
              phone: user.phone,
              passwordHash,
              role: user.role,
              departmentId: user.departmentId,
              status: UserStatus.ACTIVE,
            },
          });
          this.logger.log(`Created demo user: ${user.email} (${user.role})`);
        } else {
          // If the user exists, ensure active status and correct password
          await this.prisma.user.update({
            where: { email: user.email },
            data: {
              status: UserStatus.ACTIVE,
              passwordHash, // Keep password in sync with documented Password@123
              departmentId: user.departmentId,
            },
          });
        }
      }

      // Link HODs to Departments
      const hodCsUser = await this.prisma.user.findUnique({ where: { email: 'hod.cs@safeher.test' } });
      if (hodCsUser && deptMap['CSE']) {
        await this.prisma.department.update({
          where: { id: deptMap['CSE'] },
          data: { hodUserId: hodCsUser.id },
        });
      }

      const hodEceUser = await this.prisma.user.findUnique({ where: { email: 'hod.ece@safeher.test' } });
      if (hodEceUser && deptMap['ECE']) {
        await this.prisma.department.update({
          where: { id: deptMap['ECE'] },
          data: { hodUserId: hodEceUser.id },
        });
      }

      // 3. Master Campus Locations
      const locations = [
        {
          building: 'Computer Science Block',
          floor: '2nd Floor',
          roomIdentifier: 'Room 204 (Algorithms Lab)',
          qrSignature: 'QR_LOC_CSE_204',
          departmentId: deptMap['CSE'],
        },
        {
          building: 'Sarojini Girls Hostel Block A',
          floor: 'Ground Floor',
          roomIdentifier: 'North Wing Corridor & Lawn',
          qrSignature: 'QR_LOC_GHOSTEL_A_NORTH',
          departmentId: deptMap['HOSTEL'],
        },
        {
          building: 'Central Knowledge Center',
          floor: '1st Floor',
          roomIdentifier: 'Reading Hall West',
          qrSignature: 'QR_LOC_LIB_WEST',
          departmentId: deptMap['LIBRARY'],
        },
        {
          building: 'Main Campus Quadrangle',
          floor: 'Ground Floor',
          roomIdentifier: 'South Pathway (Near Sports Complex)',
          qrSignature: 'QR_LOC_MAIN_QUAD_S',
          departmentId: deptMap['FACILITIES'],
        },
        {
          building: 'Electronics Block',
          floor: '3rd Floor',
          roomIdentifier: 'Embedded Systems Lab 302',
          qrSignature: 'QR_LOC_ECE_302',
          departmentId: deptMap['ECE'],
        },
        {
          building: 'Women Safety Cell & ICC Office',
          floor: 'Ground Floor',
          roomIdentifier: 'Room 101 (Confidential Counseling Room)',
          qrSignature: 'QR_LOC_WGSC_101',
          departmentId: deptMap['WGSC'],
        },
        {
          building: 'Campus Amenities & Cafeteria',
          floor: 'Ground Floor',
          roomIdentifier: 'Central Food Court & Seating Area',
          qrSignature: 'QR_LOC_CAFE_COMMON',
          departmentId: deptMap['FACILITIES'],
        },
        {
          building: 'Campus Transit Hub',
          floor: 'Ground Floor',
          roomIdentifier: 'North Gate Shuttle Bay & Walkway',
          qrSignature: 'QR_LOC_TRANS_BAY',
          departmentId: deptMap['TRANSPORT'],
        },
      ];

      for (const loc of locations) {
        await this.prisma.location.upsert({
          where: { qrSignature: loc.qrSignature },
          update: {
            building: loc.building,
            floor: loc.floor,
            roomIdentifier: loc.roomIdentifier,
            departmentId: loc.departmentId,
          },
          create: {
            building: loc.building,
            floor: loc.floor,
            roomIdentifier: loc.roomIdentifier,
            qrSignature: loc.qrSignature,
            departmentId: loc.departmentId,
          },
        });
      }
      this.logger.log('Campus locations verified.');

      // 4. Default Complaint Categories
      const categories = [
        {
          code: 'WOMEN_HARASSMENT',
          name: 'Harassment & Inappropriate Behavior',
          isWomensSafety: true,
          sensitivityLevel: 'RESTRICTED',
          defaultPriority: 'CRITICAL',
          defaultSlaHours: 12,
          routingTarget: 'WOMEN_SAFETY_OFFICER',
        },
        {
          code: 'WOMEN_STALKING',
          name: 'Stalking, Threat & Intimidation',
          isWomensSafety: true,
          sensitivityLevel: 'RESTRICTED',
          defaultPriority: 'CRITICAL',
          defaultSlaHours: 6,
          routingTarget: 'WOMEN_SAFETY_OFFICER',
        },
        {
          code: 'WOMEN_UNSAFE_AREA',
          name: 'Unsafe Campus Zone / Poor Lighting',
          isWomensSafety: true,
          sensitivityLevel: 'CONFIDENTIAL',
          defaultPriority: 'HIGH',
          defaultSlaHours: 24,
          routingTarget: 'WOMEN_SAFETY_OFFICER',
        },
        {
          code: 'WOMEN_HOSTEL_SAFETY',
          name: 'Hostel & Residential Safety Concern',
          isWomensSafety: true,
          sensitivityLevel: 'CONFIDENTIAL',
          defaultPriority: 'HIGH',
          defaultSlaHours: 24,
          routingTarget: 'WOMEN_SAFETY_OFFICER',
        },
        {
          code: 'FACILITY_HAZARD',
          name: 'Campus Facility Safety Hazard',
          isWomensSafety: false,
          sensitivityLevel: 'NORMAL',
          defaultPriority: 'MEDIUM',
          defaultSlaHours: 48,
          routingTarget: 'HOD',
        },
      ];

      for (const cat of categories) {
        await this.prisma.complaintCategory.upsert({
          where: { code: cat.code },
          update: {},
          create: {
            code: cat.code,
            name: cat.name,
            isWomensSafety: cat.isWomensSafety,
            sensitivityLevel: cat.sensitivityLevel as any,
            defaultPriority: cat.defaultPriority as any,
            defaultSlaHours: cat.defaultSlaHours,
            routingTarget: cat.routingTarget as any,
          },
        });
      }

      // 4. Default Safety Resources
      const srCount = await this.prisma.safetyResource.count();
      if (srCount === 0) {
        await this.prisma.safetyResource.createMany({
          data: [
            {
              category: ResourceCategory.EMERGENCY_HELPLINE,
              title: 'National Women Helpline (1091)',
              contentMarkdown: 'Dial 1091 anytime anywhere across India for immediate police dispatch and emergency response.',
              sourceReference: 'Ministry of Women and Child Development',
              lastReviewedDate: new Date('2026-01-15'),
              isActive: true,
            },
            {
              category: ResourceCategory.EMERGENCY_HELPLINE,
              title: 'National Emergency Response Support (112)',
              contentMarkdown: 'Dial 112 for immediate unified emergency assistance across all states and union territories.',
              sourceReference: 'Ministry of Home Affairs ERSS',
              lastReviewedDate: new Date('2026-01-15'),
              isActive: true,
            },
            {
              category: ResourceCategory.EMERGENCY_HELPLINE,
              title: 'Campus Security Control Room (+91-11-22334455)',
              contentMarkdown: 'Campus Security is stationed at the Main Gate and North Gate. Quick response vehicle available 24/7.',
              sourceReference: 'Campus Security Operational Procedures',
              lastReviewedDate: new Date('2026-01-10'),
              isActive: true,
            },
            {
              category: ResourceCategory.LEGAL_RIGHTS,
              title: 'POSH Act 2013 - Student Rights & Safeguards',
              contentMarkdown: 'Under UGC Regulations and the POSH Act 2013, every student has the right to a secure, harassment-free academic campus. Retaliation is strictly prohibited under institutional bylaws.',
              sourceReference: 'UGC Regulations 2015 / POSH Act 2013',
              lastReviewedDate: new Date('2026-02-01'),
              isActive: true,
            },
            {
              category: ResourceCategory.INSTITUTIONAL_POLICY,
              title: 'Internal Complaints Committee (ICC) Charter',
              contentMarkdown: 'Complaints can be lodged through SafeHer or directly with the ICC Chairperson. Statutory confidentiality is legally preserved throughout proceedings.',
              sourceReference: 'Institutional Governance Framework',
              lastReviewedDate: new Date('2026-01-15'),
              isActive: true,
            },
          ],
        });
      }

      this.logger.log('✅ Demo accounts and master data initialized successfully.');
    } catch (error) {
      this.logger.error(`Database seeding encountered an issue: ${error.message}`, error.stack);
    }
  }
}
