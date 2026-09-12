"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting SafeHer Campus Database Seeding...');
    await prisma.auditLog.deleteMany();
    await prisma.feedback.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.internalCaseNote.deleteMany();
    await prisma.caseAccessGrant.deleteMany();
    await prisma.complaintAssignment.deleteMany();
    await prisma.complaintStatusHistory.deleteMany();
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
    const deptCSE = await prisma.department.create({
        data: {
            name: 'Computer Science & Engineering',
            code: 'CSE',
            isActive: true,
        },
    });
    const deptEEE = await prisma.department.create({
        data: {
            name: 'Electrical & Electronics Engineering',
            code: 'EEE',
            isActive: true,
        },
    });
    const deptFacilities = await prisma.department.create({
        data: {
            name: 'Campus Facilities & Maintenance',
            code: 'FACILITIES',
            isActive: true,
        },
    });
    const deptWomenCell = await prisma.department.create({
        data: {
            name: 'Internal Complaints Committee & Women Safety Cell',
            code: 'WGSC',
            isActive: true,
        },
    });
    console.log('🏢 Departments created');
    const defaultPasswordHash = await bcrypt.hash('Password@123', 10);
    const student1 = await prisma.user.create({
        data: {
            email: 'student@safeher.test',
            name: 'Priya Sharma',
            phone: '+919876543201',
            passwordHash: defaultPasswordHash,
            role: client_1.Role.STUDENT,
            departmentId: deptCSE.id,
            status: client_1.UserStatus.ACTIVE,
        },
    });
    const student2 = await prisma.user.create({
        data: {
            email: 'student2@safeher.test',
            name: 'Ananya Verma',
            phone: '+919876543202',
            passwordHash: defaultPasswordHash,
            role: client_1.Role.STUDENT,
            departmentId: deptEEE.id,
            status: client_1.UserStatus.ACTIVE,
        },
    });
    const hodCSE = await prisma.user.create({
        data: {
            email: 'hod.cs@safeher.test',
            name: 'Dr. Ramesh Kumar',
            phone: '+919876543210',
            passwordHash: defaultPasswordHash,
            role: client_1.Role.HOD,
            departmentId: deptCSE.id,
            status: client_1.UserStatus.ACTIVE,
        },
    });
    await prisma.department.update({
        where: { id: deptCSE.id },
        data: { hodUserId: hodCSE.id },
    });
    const safetyOfficer = await prisma.user.create({
        data: {
            email: 'safetyofficer@safeher.test',
            name: 'Dr. Meenakshi Sundaram',
            phone: '+919876543220',
            passwordHash: defaultPasswordHash,
            role: client_1.Role.WOMEN_SAFETY_OFFICER,
            departmentId: deptWomenCell.id,
            status: client_1.UserStatus.ACTIVE,
        },
    });
    await prisma.department.update({
        where: { id: deptWomenCell.id },
        data: { hodUserId: safetyOfficer.id },
    });
    const principal = await prisma.user.create({
        data: {
            email: 'principal@safeher.test',
            name: 'Dr. Rajeshwar Rao',
            phone: '+919876543230',
            passwordHash: defaultPasswordHash,
            role: client_1.Role.PRINCIPAL,
            status: client_1.UserStatus.ACTIVE,
        },
    });
    const staffUser = await prisma.user.create({
        data: {
            email: 'staff@safeher.test',
            name: 'Suresh Naik',
            phone: '+919876543240',
            passwordHash: defaultPasswordHash,
            role: client_1.Role.AUTHORIZED_STAFF,
            departmentId: deptFacilities.id,
            status: client_1.UserStatus.ACTIVE,
        },
    });
    const adminUser = await prisma.user.create({
        data: {
            email: 'admin@safeher.test',
            name: 'System Administrator',
            phone: '+919876543299',
            passwordHash: defaultPasswordHash,
            role: client_1.Role.ADMIN,
            status: client_1.UserStatus.ACTIVE,
        },
    });
    console.log('👥 Demo accounts initialized for all 6 roles');
    const locRoom204 = await prisma.location.create({
        data: {
            building: 'Computer Science Block',
            floor: '2nd Floor',
            roomIdentifier: 'Room 204 (Algorithms Lab)',
            qrSignature: 'QR_LOC_CSE_204',
            departmentId: deptCSE.id,
        },
    });
    const locHostelA = await prisma.location.create({
        data: {
            building: 'Sarojini Girls Hostel Block A',
            floor: 'Ground Floor',
            roomIdentifier: 'North Wing Corridor & Lawn',
            qrSignature: 'QR_LOC_GHOSTEL_A_NORTH',
        },
    });
    const locLibrary = await prisma.location.create({
        data: {
            building: 'Central Knowledge Center',
            floor: '1st Floor',
            roomIdentifier: 'Reading Hall West',
            qrSignature: 'QR_LOC_LIB_WEST',
        },
    });
    const locQuad = await prisma.location.create({
        data: {
            building: 'Main Campus Quadrangle',
            floor: 'Ground',
            roomIdentifier: 'South Pathway (Near Sports Complex)',
            qrSignature: 'QR_LOC_MAIN_QUAD_S',
        },
    });
    console.log('📍 Campus locations configured');
    const catHarassment = await prisma.complaintCategory.create({
        data: {
            name: 'Harassment & Inappropriate Behavior',
            code: 'WOMEN_HARASSMENT',
            isWomensSafety: true,
            sensitivityLevel: client_1.SensitivityLevel.RESTRICTED,
            defaultPriority: client_1.Priority.CRITICAL,
            defaultSlaHours: 12,
            routingTarget: client_1.RoutingTarget.WOMEN_SAFETY_OFFICER,
        },
    });
    const catStalking = await prisma.complaintCategory.create({
        data: {
            name: 'Stalking, Threat & Intimidation',
            code: 'WOMEN_STALKING',
            isWomensSafety: true,
            sensitivityLevel: client_1.SensitivityLevel.RESTRICTED,
            defaultPriority: client_1.Priority.CRITICAL,
            defaultSlaHours: 6,
            routingTarget: client_1.RoutingTarget.WOMEN_SAFETY_OFFICER,
        },
    });
    const catUnsafeArea = await prisma.complaintCategory.create({
        data: {
            name: 'Unsafe Campus Zone / Poor Lighting',
            code: 'WOMEN_UNSAFE_AREA',
            isWomensSafety: true,
            sensitivityLevel: client_1.SensitivityLevel.CONFIDENTIAL,
            defaultPriority: client_1.Priority.HIGH,
            defaultSlaHours: 24,
            routingTarget: client_1.RoutingTarget.WOMEN_SAFETY_OFFICER,
        },
    });
    const catHostelSafety = await prisma.complaintCategory.create({
        data: {
            name: 'Hostel & Residential Safety Concern',
            code: 'WOMEN_HOSTEL_SAFETY',
            isWomensSafety: true,
            sensitivityLevel: client_1.SensitivityLevel.CONFIDENTIAL,
            defaultPriority: client_1.Priority.HIGH,
            defaultSlaHours: 24,
            routingTarget: client_1.RoutingTarget.HOSTEL_WARDEN,
        },
    });
    const catSanitation = await prisma.complaintCategory.create({
        data: {
            name: 'Restroom Hygiene & Menstrual Support',
            code: 'WOMEN_SANITATION',
            isWomensSafety: true,
            sensitivityLevel: client_1.SensitivityLevel.CONFIDENTIAL,
            defaultPriority: client_1.Priority.MEDIUM,
            defaultSlaHours: 24,
            routingTarget: client_1.RoutingTarget.WOMEN_SAFETY_OFFICER,
        },
    });
    const catElectrical = await prisma.complaintCategory.create({
        data: {
            name: 'Electrical Maintenance & Faults',
            code: 'CAMPUS_ELECTRICAL',
            isWomensSafety: false,
            sensitivityLevel: client_1.SensitivityLevel.NORMAL,
            defaultPriority: client_1.Priority.MEDIUM,
            defaultSlaHours: 48,
            routingTarget: client_1.RoutingTarget.FACILITIES_MAINTENANCE,
        },
    });
    const catLabEquipment = await prisma.complaintCategory.create({
        data: {
            name: 'Classroom & Laboratory Equipment',
            code: 'CAMPUS_LAB_EQUIPMENT',
            isWomensSafety: false,
            sensitivityLevel: client_1.SensitivityLevel.NORMAL,
            defaultPriority: client_1.Priority.LOW,
            defaultSlaHours: 72,
            routingTarget: client_1.RoutingTarget.HOD,
        },
    });
    console.log('🏷️ Complaint categories initialized');
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
    await prisma.safetyResource.createMany({
        data: [
            {
                category: client_1.ResourceCategory.INSTITUTIONAL_POLICY,
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
                category: client_1.ResourceCategory.LEGAL_RIGHTS,
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
                category: client_1.ResourceCategory.SUPPORT_GUIDE,
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
    await prisma.institutionSetting.create({
        data: {
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
    console.log('⚙️ Institutional configuration initialized');
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
//# sourceMappingURL=seed.js.map