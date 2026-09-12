import { PrismaClient, Role, UserStatus, SensitivityLevel, Priority, RoutingTarget, ResourceCategory, TaskStatus, NotificationType, ComplaintStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting SafeHer Campus Database Seeding...');

  const isProduction = process.env.NODE_ENV === 'production';
  const shouldPurge = !isProduction && process.env.RESET_DB === 'true';

  if (shouldPurge) {
    console.log('🧹 Purging existing test records (RESET_DB=true)...');
    await prisma.auditLog.deleteMany();
    await prisma.feedback.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.internalCaseNote.deleteMany();
    await prisma.caseAccessGrant.deleteMany();
    await prisma.complaintAssignment.deleteMany();
    await prisma.complaintTransfer.deleteMany();
    await prisma.complaintStatusHistory.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.task.deleteMany();
    await prisma.complaint.deleteMany();
    await prisma.sosResponder.deleteMany();
    await prisma.emergencySosEvent.deleteMany();
    await prisma.emergencyContact.deleteMany();
    await prisma.safetyResource.deleteMany();
    await prisma.institutionSetting.deleteMany();
    await prisma.deviceToken.deleteMany();
    await prisma.session.deleteMany();
    await prisma.location.deleteMany();
    await prisma.complaintCategory.deleteMany();
    await prisma.user.deleteMany();
    await prisma.department.deleteMany();
    console.log('🧹 Purged existing tables');
  } else {
    console.log('🔒 Production-safe mode: Preserving existing tables and users (no records deleted)');
  }

  // 2. Create Master Campus Departments (Idempotent upsert)
  const deptCSE = await prisma.department.upsert({
    where: { code: 'CSE' },
    update: {},
    create: {
      name: 'Computer Science & Engineering',
      code: 'CSE',
      isActive: true,
    },
  });

  const deptECE = await prisma.department.upsert({
    where: { code: 'ECE' },
    update: {},
    create: {
      name: 'Electronics & Communication Engineering',
      code: 'ECE',
      isActive: true,
    },
  });

  const deptEEE = await prisma.department.upsert({
    where: { code: 'EEE' },
    update: {},
    create: {
      name: 'Electrical & Electronics Engineering',
      code: 'EEE',
      isActive: true,
    },
  });

  const deptMech = await prisma.department.upsert({
    where: { code: 'MECH' },
    update: {},
    create: {
      name: 'Mechanical Engineering',
      code: 'MECH',
      isActive: true,
    },
  });

  const deptCivil = await prisma.department.upsert({
    where: { code: 'CIVIL' },
    update: {},
    create: {
      name: 'Civil Engineering',
      code: 'CIVIL',
      isActive: true,
    },
  });

  const deptFacilities = await prisma.department.upsert({
    where: { code: 'FACILITIES' },
    update: {},
    create: {
      name: 'Campus Facilities & Maintenance',
      code: 'FACILITIES',
      isActive: true,
    },
  });

  const deptWomenCell = await prisma.department.upsert({
    where: { code: 'WGSC' },
    update: {},
    create: {
      name: 'Women Safety Cell & Student Welfare',
      code: 'WGSC',
      isActive: true,
    },
  });

  const deptLibrary = await prisma.department.upsert({
    where: { code: 'LIBRARY' },
    update: {},
    create: {
      name: 'Central Library Services',
      code: 'LIBRARY',
      isActive: true,
    },
  });

  const deptHostel = await prisma.department.upsert({
    where: { code: 'HOSTEL' },
    update: {},
    create: {
      name: 'Hostel Administration & Residential Life',
      code: 'HOSTEL',
      isActive: true,
    },
  });

  const deptTransport = await prisma.department.upsert({
    where: { code: 'TRANSPORT' },
    update: {},
    create: {
      name: 'Campus Transport Services',
      code: 'TRANSPORT',
      isActive: true,
    },
  });

  const deptSecurity = await prisma.department.upsert({
    where: { code: 'SECURITY' },
    update: {},
    create: {
      name: 'Campus Security & Surveillance',
      code: 'SECURITY',
      isActive: true,
    },
  });

  const deptAdmin = await prisma.department.upsert({
    where: { code: 'ADMIN_DEPT' },
    update: {},
    create: {
      name: 'Administration & Student Affairs',
      code: 'ADMIN_DEPT',
      isActive: true,
    },
  });

  console.log('🏢 Master Campus Departments initialized (idempotent)');

  // 3. Create Seed Users for All Roles (Default demo password: "Password@123")
  const defaultPasswordHash = await bcrypt.hash('Password@123', 10);

  // Student 1 (Priya Sharma)
  const student1 = await prisma.user.upsert({
    where: { email: 'student@safeher.test' },
    update: {},
    create: {
      email: 'student@safeher.test',
      name: 'Priya Sharma',
      phone: '+919876543201',
      passwordHash: defaultPasswordHash,
      role: Role.STUDENT,
      departmentId: deptCSE.id,
      status: UserStatus.ACTIVE,
    },
  });

  // Student 2 (Ananya Verma)
  const student2 = await prisma.user.upsert({
    where: { email: 'student2@safeher.test' },
    update: {},
    create: {
      email: 'student2@safeher.test',
      name: 'Ananya Verma',
      phone: '+919876543202',
      passwordHash: defaultPasswordHash,
      role: Role.STUDENT,
      departmentId: deptEEE.id,
      status: UserStatus.ACTIVE,
    },
  });

  // HOD Computer Science (Dr. Ramesh Kumar)
  const hodCSE = await prisma.user.upsert({
    where: { email: 'hod.cs@safeher.test' },
    update: {},
    create: {
      email: 'hod.cs@safeher.test',
      name: 'Dr. Ramesh Kumar',
      phone: '+919876543210',
      passwordHash: defaultPasswordHash,
      role: Role.HOD,
      departmentId: deptCSE.id,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.department.update({
    where: { id: deptCSE.id },
    data: { hodUserId: hodCSE.id },
  });

  // HOD Electronics & Communication (Dr. Arvind Swaminathan)
  const hodECE = await prisma.user.upsert({
    where: { email: 'hod.ece@safeher.test' },
    update: {},
    create: {
      email: 'hod.ece@safeher.test',
      name: 'Dr. Arvind Swaminathan',
      phone: '+919876543211',
      passwordHash: defaultPasswordHash,
      role: Role.HOD,
      departmentId: deptECE.id,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.department.update({
    where: { id: deptECE.id },
    data: { hodUserId: hodECE.id },
  });

  // HOD Electrical Engineering (Dr. Suresh Reddy)
  const hodEEE = await prisma.user.upsert({
    where: { email: 'hod.eee@safeher.test' },
    update: {},
    create: {
      email: 'hod.eee@safeher.test',
      name: 'Dr. Suresh Reddy',
      phone: '+919876543212',
      passwordHash: defaultPasswordHash,
      role: Role.HOD,
      departmentId: deptEEE.id,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.department.update({
    where: { id: deptEEE.id },
    data: { hodUserId: hodEEE.id },
  });

  // Women Safety / ICC Officer (Dr. Meenakshi Sundaram)
  const safetyOfficer = await prisma.user.upsert({
    where: { email: 'safetyofficer@safeher.test' },
    update: {},
    create: {
      email: 'safetyofficer@safeher.test',
      name: 'Dr. Meenakshi Sundaram',
      phone: '+919876543220',
      passwordHash: defaultPasswordHash,
      role: Role.WOMEN_SAFETY_OFFICER,
      departmentId: deptWomenCell.id,
      status: UserStatus.ACTIVE,
    },
  });

  // Also support safety@safeher.test alias
  await prisma.user.upsert({
    where: { email: 'safety@safeher.test' },
    update: {},
    create: {
      email: 'safety@safeher.test',
      name: 'Dr. Meenakshi Sundaram (Cell Lead)',
      phone: '+919876543221',
      passwordHash: defaultPasswordHash,
      role: Role.WOMEN_SAFETY_OFFICER,
      departmentId: deptWomenCell.id,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.department.update({
    where: { id: deptWomenCell.id },
    data: { hodUserId: safetyOfficer.id },
  });

  // Principal / Senior Authority (Dr. Rajeshwar Rao)
  const principal = await prisma.user.upsert({
    where: { email: 'principal@safeher.test' },
    update: {},
    create: {
      email: 'principal@safeher.test',
      name: 'Dr. Rajeshwar Rao',
      phone: '+919876543230',
      passwordHash: defaultPasswordHash,
      role: Role.PRINCIPAL,
      status: UserStatus.ACTIVE,
    },
  });

  // Authorized Staff (Suresh Naik - Maintenance Technician)
  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@safeher.test' },
    update: {},
    create: {
      email: 'staff@safeher.test',
      name: 'Suresh Naik',
      phone: '+919876543240',
      passwordHash: defaultPasswordHash,
      role: Role.AUTHORIZED_STAFF,
      departmentId: deptFacilities.id,
      status: UserStatus.ACTIVE,
    },
  });

  // System Administrator (Admin)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@safeher.test' },
    update: {},
    create: {
      email: 'admin@safeher.test',
      name: 'System Administrator',
      phone: '+919876543299',
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  console.log('👥 Demo accounts initialized for all roles');

  // 4. Create Campus Locations with QR Signatures (Idempotent upsert)
  const locRoom204 = await prisma.location.upsert({
    where: { qrSignature: 'QR_LOC_CSE_204' },
    update: {},
    create: {
      building: 'Computer Science Block',
      floor: '2nd Floor',
      roomIdentifier: 'Room 204 (Algorithms Lab)',
      qrSignature: 'QR_LOC_CSE_204',
      departmentId: deptCSE.id,
    },
  });

  const locHostelA = await prisma.location.upsert({
    where: { qrSignature: 'QR_LOC_GHOSTEL_A_NORTH' },
    update: {},
    create: {
      building: 'Sarojini Girls Hostel Block A',
      floor: 'Ground Floor',
      roomIdentifier: 'North Wing Corridor & Lawn',
      qrSignature: 'QR_LOC_GHOSTEL_A_NORTH',
      departmentId: deptHostel.id,
    },
  });

  const locLibrary = await prisma.location.upsert({
    where: { qrSignature: 'QR_LOC_LIB_WEST' },
    update: {},
    create: {
      building: 'Central Knowledge Center',
      floor: '1st Floor',
      roomIdentifier: 'Reading Hall West',
      qrSignature: 'QR_LOC_LIB_WEST',
      departmentId: deptLibrary.id,
    },
  });

  const locQuad = await prisma.location.upsert({
    where: { qrSignature: 'QR_LOC_MAIN_QUAD_S' },
    update: {},
    create: {
      building: 'Main Campus Quadrangle',
      floor: 'Ground',
      roomIdentifier: 'South Pathway (Near Sports Complex)',
      qrSignature: 'QR_LOC_MAIN_QUAD_S',
      departmentId: deptFacilities.id,
    },
  });

  console.log('📍 Campus locations configured (idempotent)');

  // 5. Create Complaint Categories (Idempotent upsert)
  const catHarassment = await prisma.complaintCategory.upsert({
    where: { code: 'WOMEN_HARASSMENT' },
    update: {},
    create: {
      name: 'Harassment & Inappropriate Behavior',
      code: 'WOMEN_HARASSMENT',
      isWomensSafety: true,
      sensitivityLevel: SensitivityLevel.RESTRICTED,
      defaultPriority: Priority.CRITICAL,
      defaultSlaHours: 12,
      routingTarget: RoutingTarget.WOMEN_SAFETY_OFFICER,
    },
  });

  const catStalking = await prisma.complaintCategory.upsert({
    where: { code: 'WOMEN_STALKING' },
    update: {},
    create: {
      name: 'Stalking, Threat & Intimidation',
      code: 'WOMEN_STALKING',
      isWomensSafety: true,
      sensitivityLevel: SensitivityLevel.RESTRICTED,
      defaultPriority: Priority.CRITICAL,
      defaultSlaHours: 6,
      routingTarget: RoutingTarget.WOMEN_SAFETY_OFFICER,
    },
  });

  const catUnsafeArea = await prisma.complaintCategory.upsert({
    where: { code: 'WOMEN_UNSAFE_AREA' },
    update: {},
    create: {
      name: 'Unsafe Campus Zone / Poor Lighting',
      code: 'WOMEN_UNSAFE_AREA',
      isWomensSafety: true,
      sensitivityLevel: SensitivityLevel.CONFIDENTIAL,
      defaultPriority: Priority.HIGH,
      defaultSlaHours: 24,
      routingTarget: RoutingTarget.WOMEN_SAFETY_OFFICER,
    },
  });

  const catHostelSafety = await prisma.complaintCategory.upsert({
    where: { code: 'WOMEN_HOSTEL_SAFETY' },
    update: {},
    create: {
      name: 'Hostel & Residential Safety Concern',
      code: 'WOMEN_HOSTEL_SAFETY',
      isWomensSafety: true,
      sensitivityLevel: SensitivityLevel.CONFIDENTIAL,
      defaultPriority: Priority.HIGH,
      defaultSlaHours: 24,
      routingTarget: RoutingTarget.HOSTEL_WARDEN,
    },
  });

  const catSanitation = await prisma.complaintCategory.upsert({
    where: { code: 'WOMEN_SANITATION' },
    update: {},
    create: {
      name: 'Restroom Hygiene & Menstrual Support',
      code: 'WOMEN_SANITATION',
      isWomensSafety: true,
      sensitivityLevel: SensitivityLevel.CONFIDENTIAL,
      defaultPriority: Priority.MEDIUM,
      defaultSlaHours: 24,
      routingTarget: RoutingTarget.WOMEN_SAFETY_OFFICER,
    },
  });

  const catElectrical = await prisma.complaintCategory.upsert({
    where: { code: 'CAMPUS_ELECTRICAL' },
    update: {},
    create: {
      name: 'Electrical Maintenance & Faults',
      code: 'CAMPUS_ELECTRICAL',
      isWomensSafety: false,
      sensitivityLevel: SensitivityLevel.NORMAL,
      defaultPriority: Priority.MEDIUM,
      defaultSlaHours: 48,
      routingTarget: RoutingTarget.FACILITIES_MAINTENANCE,
    },
  });

  const catLabEquipment = await prisma.complaintCategory.upsert({
    where: { code: 'CAMPUS_LAB_EQUIPMENT' },
    update: {},
    create: {
      name: 'Classroom & Laboratory Equipment',
      code: 'CAMPUS_LAB_EQUIPMENT',
      isWomensSafety: false,
      sensitivityLevel: SensitivityLevel.NORMAL,
      defaultPriority: Priority.LOW,
      defaultSlaHours: 72,
      routingTarget: RoutingTarget.HOD,
    },
  });

  console.log('🏷️ Complaint categories initialized (idempotent)');

  // 6. Seed Emergency Contacts (Idempotent)
  const ecCount = await prisma.emergencyContact.count();
  if (ecCount === 0) {
    await prisma.emergencyContact.createMany({
      data: [
        {
          name: 'Campus 24/7 Security Control Room',
          roleTitle: 'Chief Security Officer',
          phoneNumber: '+91-11-22334455',
          priorityOrder: 1,
          isActive: true,
        },
        {
          name: 'National Women Helpline (24/7 Toll-Free)',
          roleTitle: 'Government of India Emergency Support',
          phoneNumber: '1091',
          priorityOrder: 2,
          isActive: true,
        },
        {
          name: 'National Emergency Response System',
          roleTitle: 'Police / Medical / Fire Emergency',
          phoneNumber: '112',
          priorityOrder: 3,
          isActive: true,
        },
        {
          name: 'Campus Health Center & Ambulance',
          roleTitle: 'Medical Resident Doctor',
          phoneNumber: '+91-11-22339900',
          priorityOrder: 4,
          isActive: true,
        },
        {
          name: 'Student Psychological Counseling Cell',
          roleTitle: 'Resident Counselor',
          phoneNumber: '+91-9876543290',
          priorityOrder: 5,
          isActive: true,
        },
      ],
    });
    console.log('📞 Emergency contacts registered');
  } else {
    console.log('📞 Emergency contacts already configured');
  }

  // 7. Seed Statutory Safety Resources & Guides (Idempotent)
  const srCount = await prisma.safetyResource.count();
  if (srCount === 0) {
    await prisma.safetyResource.createMany({
      data: [
        {
          category: ResourceCategory.INSTITUTIONAL_POLICY,
          title: 'Institutional Internal Complaints Committee (ICC) & POSH Guidelines',
          contentMarkdown: `### Policy Overview on Prevention of Sexual Harassment (POSH)
1. **Mandate:** In compliance with the Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 and UGC Regulations 2015, our institution maintains a zero-tolerance policy against sexual harassment.
2. **Filing a Complaint:** Any aggrieved woman student or employee can submit a confidential complaint through the SafeHer Campus portal within 3 months of an incident.
3. **Investigation Timeline:** The ICC conducts inquiries adhering to principles of natural justice and submits findings within 90 days.
4. **Confidentiality:** Strict statutory confidentiality is maintained regarding the identity of the aggrieved woman, respondent, and witnesses.`,
          sourceReference: 'UGC Regulations 2015 / POSH Act 2013',
          lastReviewedDate: new Date('2026-01-15'),
          isActive: true,
        },
        {
          category: ResourceCategory.LEGAL_RIGHTS,
          title: 'Statutory Protections under the Bharatiya Nyaya Sanhita (BNS)',
          contentMarkdown: `### Key Statutory Provisions for Women's Safety
- **Stalking & Cyber-Stalking:** Section 78 of the Bharatiya Nyaya Sanhita covers monitoring woman's internet activity or physical following without consent.
- **Outraging Modesty:** Section 74 & 75 covers assault, criminal force, or unwelcome sexual remarks.
- **Voyeurism:** Section 77 penalizes capturing or sharing private images without consent.
*Note: This material is provided for educational and legal awareness purposes only and does not constitute formal legal counsel.*`,
          sourceReference: 'Bharatiya Nyaya Sanhita (BNS) 2023',
          lastReviewedDate: new Date('2026-02-01'),
          isActive: true,
        },
        {
          category: ResourceCategory.SUPPORT_GUIDE,
          title: 'Campus Late-Hour Safe-Walk & Security Escort Protocol',
          contentMarkdown: `### Safe-Walk Services
- Students studying late in central libraries or engineering labs after 20:00 can request a security escort to their residential hostel by tapping the Emergency / Safety button in the SafeHer app or calling the control room at +91-11-22334455.
- Designated illuminated safe corridors are patrolled continuously by security personnel between 18:00 and 06:00.`,
          sourceReference: 'Campus Security Operational Standard Operating Procedures',
          lastReviewedDate: new Date('2026-01-10'),
          isActive: true,
        },
      ],
    });
    console.log('📖 Safety resources & legal awareness guides seeded');
  } else {
    console.log('📖 Safety resources already configured');
  }

  // 8. Seed Institution Settings & Operating Calendar (Idempotent upsert)
  await prisma.institutionSetting.upsert({
    where: { key: 'INSTITUTION_OPERATING_CALENDAR' },
    update: {},
    create: {
      key: 'INSTITUTION_OPERATING_CALENDAR',
      valueJson: {
        institutionName: 'SafeHer Model University & Technical Campus',
        workingHours: {
          start: '09:00',
          end: '17:00',
          timezone: 'Asia/Kolkata',
          workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        },
        emergencyControlRoom: '+91-11-22334455',
        autoEscalationEnabled: true,
      },
      operatingCalendarJson: {
        holidays2026: [
          { date: '2026-01-26', name: 'Republic Day' },
          { date: '2026-03-04', name: 'Holi' },
          { date: '2026-08-15', name: 'Independence Day' },
          { date: '2026-10-02', name: 'Gandhi Jayanti' },
          { date: '2026-10-20', name: 'Dussehra' },
          { date: '2026-11-08', name: 'Diwali' },
        ],
      },
    },
  });

  console.log('⚙️ Institutional configuration initialized (idempotent)');

  // 9. Seed Demo Complaints across Departments & Roles (Development / Testing Only)
  if (!isProduction) {
    const existingComplaints = await prisma.complaint.count();
    if (existingComplaints === 0) {
      console.log('🧪 Seeding realistic demo complaints, action tasks, and notifications for development/testing...');
      // Complaint 1: CSE Department - Broken Lab Terminal & Faulty Wiring (SUBMITTED)
      const cmp1 = await prisma.complaint.create({
    data: {
      publicComplaintNumber: 'CMP-2026-000101',
      studentId: student1.id,
      categoryId: catLabEquipment.id,
      locationId: locRoom204.id,
      departmentId: deptCSE.id,
      description: 'Lab Terminal #14 keyboard connector is damaged and exposed wiring is causing electric sparks.',
      priority: Priority.MEDIUM,
      confidentialityLevel: SensitivityLevel.NORMAL,
      status: ComplaintStatus.SUBMITTED,
    },
  });

  await prisma.complaintStatusHistory.create({
    data: {
      complaintId: cmp1.id,
      oldStatus: ComplaintStatus.SUBMITTED,
      newStatus: ComplaintStatus.SUBMITTED,
      changedByUserId: student1.id,
      reasonComment: 'Complaint submitted by student via SafeHer mobile portal',
    },
  });

  // Complaint 2: CSE Department - Noise & corridor harassment (IN_PROGRESS)
  const cmp2 = await prisma.complaint.create({
    data: {
      publicComplaintNumber: 'CMP-2026-000102',
      studentId: student1.id,
      categoryId: catHarassment.id,
      locationId: locRoom204.id,
      departmentId: deptCSE.id,
      assignedTo: hodCSE.id,
      description: 'Repeated inappropriate remarks in 2nd floor lab corridor between 4:00 PM and 5:00 PM.',
      priority: Priority.HIGH,
      confidentialityLevel: SensitivityLevel.NORMAL,
      status: ComplaintStatus.IN_PROGRESS,
    },
  });

  await prisma.complaintStatusHistory.createMany({
    data: [
      {
        complaintId: cmp2.id,
        oldStatus: ComplaintStatus.SUBMITTED,
        newStatus: ComplaintStatus.UNDER_REVIEW,
        changedByUserId: hodCSE.id,
        reasonComment: 'Taken up for departmental inquiry and security footage review.',
      },
      {
        complaintId: cmp2.id,
        oldStatus: ComplaintStatus.UNDER_REVIEW,
        newStatus: ComplaintStatus.IN_PROGRESS,
        changedByUserId: hodCSE.id,
        reasonComment: 'Security assigned to monitor corridor; students identified for inquiry.',
      },
    ],
  });

  // Complaint 3: ECE Department - Lab equipment & safety (UNDER_REVIEW)
  const cmp3 = await prisma.complaint.create({
    data: {
      publicComplaintNumber: 'CMP-2026-000103',
      studentId: student1.id,
      categoryId: catElectrical.id,
      locationId: locQuad.id,
      departmentId: deptECE.id,
      description: 'Oscilloscope bench earth leakage detected in ECE communication hardware lab.',
      priority: Priority.HIGH,
      confidentialityLevel: SensitivityLevel.NORMAL,
      status: ComplaintStatus.UNDER_REVIEW,
    },
  });

  await prisma.complaintStatusHistory.create({
    data: {
      complaintId: cmp3.id,
      oldStatus: ComplaintStatus.SUBMITTED,
      newStatus: ComplaintStatus.UNDER_REVIEW,
      changedByUserId: hodECE.id,
      reasonComment: 'HOD ECE initiated technician electrical safety inspection.',
    },
  });

  // Complaint 4: EEE Department - Main Substation Lighting (ASSIGNED)
  const cmp4 = await prisma.complaint.create({
    data: {
      publicComplaintNumber: 'CMP-2026-000104',
      studentId: student2.id,
      categoryId: catElectrical.id,
      locationId: locQuad.id,
      departmentId: deptEEE.id,
      assignedTo: staffUser.id,
      description: 'Streetlights between EEE block and south quad pathway are flickering and out of order.',
      priority: Priority.HIGH,
      confidentialityLevel: SensitivityLevel.NORMAL,
      status: ComplaintStatus.ASSIGNED,
    },
  });

  await prisma.complaintStatusHistory.create({
    data: {
      complaintId: cmp4.id,
      oldStatus: ComplaintStatus.SUBMITTED,
      newStatus: ComplaintStatus.ASSIGNED,
      changedByUserId: hodEEE.id,
      reasonComment: 'Assigned to Facilities Maintenance Technician Suresh Naik.',
    },
  });

  // Complaint 5: Women Safety Cell - Unsafe Campus Zone (CONFIDENTIAL - IN_PROGRESS)
  const cmp5 = await prisma.complaint.create({
    data: {
      publicComplaintNumber: 'CMP-2026-000105',
      studentId: student1.id,
      categoryId: catUnsafeArea.id,
      locationId: locHostelA.id,
      departmentId: deptWomenCell.id,
      assignedTo: safetyOfficer.id,
      description: 'Dimly lit walkway behind Sarojini Hostel Block A near lawn boundary after 8 PM.',
      priority: Priority.HIGH,
      confidentialityLevel: SensitivityLevel.CONFIDENTIAL,
      status: ComplaintStatus.IN_PROGRESS,
    },
  });

  await prisma.complaintStatusHistory.create({
    data: {
      complaintId: cmp5.id,
      oldStatus: ComplaintStatus.SUBMITTED,
      newStatus: ComplaintStatus.IN_PROGRESS,
      changedByUserId: safetyOfficer.id,
      reasonComment: 'Patrolling increased and facilities notified to install solar high-mast floodlights.',
    },
  });

  // Complaint 6: Women Safety Cell - Stalking Incident (RESTRICTED - UNDER_REVIEW)
  const cmp6 = await prisma.complaint.create({
    data: {
      publicComplaintNumber: 'CMP-2026-000106',
      studentId: student2.id,
      categoryId: catStalking.id,
      locationId: locLibrary.id,
      departmentId: deptWomenCell.id,
      assignedTo: safetyOfficer.id,
      description: 'Persistent following and unwelcome behavior observed near library west entrance.',
      priority: Priority.CRITICAL,
      confidentialityLevel: SensitivityLevel.RESTRICTED,
      status: ComplaintStatus.UNDER_REVIEW,
    },
  });

  await prisma.complaintStatusHistory.create({
    data: {
      complaintId: cmp6.id,
      oldStatus: ComplaintStatus.SUBMITTED,
      newStatus: ComplaintStatus.UNDER_REVIEW,
      changedByUserId: safetyOfficer.id,
      reasonComment: 'ICC preliminary inquiry launched with confidential security escort support.',
    },
  });

  // Complaint 7: CSE Department - Resolved Case with Evidence Photo (RESOLVED)
  const cmp7 = await prisma.complaint.create({
    data: {
      publicComplaintNumber: 'CMP-2026-000107',
      studentId: student1.id,
      categoryId: catLabEquipment.id,
      locationId: locRoom204.id,
      departmentId: deptCSE.id,
      assignedTo: hodCSE.id,
      description: 'Projector HDMI port replacement required in Room 204.',
      priority: Priority.LOW,
      confidentialityLevel: SensitivityLevel.NORMAL,
      status: ComplaintStatus.RESOLVED,
      resolvedAt: new Date(),
      resolutionSummary: 'HDMI transceiver cable and wall mount port replaced and tested with projector output.',
      resolutionPhotoKey: 'resolution-evidence-projector-fixed.jpg',
    },
  });

  await prisma.complaintStatusHistory.create({
    data: {
      complaintId: cmp7.id,
      oldStatus: ComplaintStatus.IN_PROGRESS,
      newStatus: ComplaintStatus.RESOLVED,
      changedByUserId: hodCSE.id,
      reasonComment: 'Hardware repair completed and tested. Ready for student verification.',
    },
  });

  // Complaint 8: CSE Department - Reopened Case (REOPENED)
  const cmp8 = await prisma.complaint.create({
    data: {
      publicComplaintNumber: 'CMP-2026-000108',
      studentId: student1.id,
      categoryId: catElectrical.id,
      locationId: locRoom204.id,
      departmentId: deptCSE.id,
      description: 'Air conditioning unit trip switch recurring fault in Room 204.',
      priority: Priority.MEDIUM,
      confidentialityLevel: SensitivityLevel.NORMAL,
      status: ComplaintStatus.REOPENED,
    },
  });

  await prisma.complaintStatusHistory.createMany({
    data: [
      {
        complaintId: cmp8.id,
        oldStatus: ComplaintStatus.RESOLVED,
        newStatus: ComplaintStatus.REOPENED,
        changedByUserId: student1.id,
        reasonComment: 'Student reported circuit breaker tripped again after 30 minutes of usage.',
      },
    ],
  });

  console.log('📋 Seeded demo complaints for CSE, ECE, EEE, and Women Safety Cell');

  // 10. Seed Action Items & Tasks
  await prisma.task.createMany({
    data: [
      {
        title: 'Inspect Central Knowledge Center Security Cameras',
        description: 'Verify night vision and storage retention for CCTV cameras on 1st Floor reading hall.',
        departmentId: deptSecurity.id,
        assignedToUserId: staffUser.id,
        createdByUserId: principal.id,
        status: TaskStatus.IN_PROGRESS,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Quarterly POSH Committee Review & Incident Audit',
        description: 'Compile monthly compliance metrics and review active restricted cases.',
        departmentId: deptWomenCell.id,
        assignedToUserId: safetyOfficer.id,
        createdByUserId: principal.id,
        status: TaskStatus.TODO,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Room 204 Electrical Circuit Safety Recertification',
        description: 'Verify MCB rating and lab main earthing with university maintenance engineer.',
        departmentId: deptCSE.id,
        assignedToUserId: staffUser.id,
        createdByUserId: hodCSE.id,
        status: TaskStatus.TODO,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log('📝 Action items & departmental tasks seeded');

  // 11. Seed Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: student1.id,
        title: 'Welcome to SafeHer Campus',
        message: 'Your institutional account is active. You can report grievances and access 24/7 campus safety resources.',
        type: NotificationType.SYSTEM as any,
      },
      {
        userId: student1.id,
        title: 'Case Resolution Update',
        message: 'Your complaint CMP-2026-000107 has been marked RESOLVED. Please review and confirm resolution.',
        type: NotificationType.COMPLAINT_RESOLVED as any,
        complaintId: cmp7.id,
      },
      {
        userId: hodCSE.id,
        title: 'New Complaint in CSE Department',
        message: 'Grievance CMP-2026-000101 has been submitted in Algorithms Lab (Room 204).',
        type: NotificationType.COMPLAINT_CREATED as any,
        complaintId: cmp1.id,
      },
      {
        userId: principal.id,
        title: 'Institutional Safety Briefing Ready',
        message: '6 campus grievances active across departments. 2 high priority cases under active review.',
        type: NotificationType.SYSTEM as any,
      },
    ],
  });

      console.log('🔔 Notifications seeded');
    } else {
      console.log('ℹ️ Existing complaints found. Skipping demo grievance seeding.');
    }
  } else {
    console.log('🛡️ Production mode: Mock complaints, fake history, and test tasks omitted.');
  }

  console.log('✅ SafeHer Campus Seed Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
