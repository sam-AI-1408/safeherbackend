/**
 * SafeHer RBAC/ABAC Security Test Suite
 *
 * Run with: npm run test -- --testPathPattern=security-rbac --forceExit --testTimeout=30000
 *
 * This test suite calls the LIVE backend server (must be running on port 3000).
 * It does NOT embed the NestJS app to avoid Prisma connection conflicts.
 */

import axios, { AxiosInstance } from 'axios';

const BASE = 'http://localhost:3000/api/v1';

const http: AxiosInstance = axios.create({
  baseURL: BASE,
  validateStatus: () => true,      // Never throw on HTTP errors
  timeout: 10000,
});

// ─── Helpers ────────────────────────────────────────────────────────────────

async function login(email: string): Promise<string> {
  const res = await http.post('/auth/login', {
    email,
    password: 'Password@123',
    deviceInfo: 'RBAC Security Test Runner',
  });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: status ${res.status} – ${JSON.stringify(res.data)}`);
  }
  const token = res.data?.data?.accessToken ?? res.data?.accessToken;
  if (!token) throw new Error(`No token returned for ${email}`);
  return token;
}

async function getComplaints(token: string) {
  const res = await http.get('/complaints', { headers: { Authorization: `Bearer ${token}` } });
  return res;
}

// ─── State ───────────────────────────────────────────────────────────────────

let studentToken: string;
let student2Token: string;
let hodCsToken: string;
let hodEceToken: string;
let principalToken: string;
let safetyOfficerToken: string;

let cseComplaintId: string;       // student1's CSE complaint  (SUBMITTED)
let eceComplaintId: string;       // student1's ECE complaint  (UNDER_REVIEW)
let restrictedComplaintId: string; // student2's restricted complaint (RESTRICTED / UNDER_REVIEW)
let student2ComplaintId: string;  // student2's EEE complaint  (ASSIGNED)
let eeDepartmentId: string;

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('SafeHer RBAC & ABAC Security Test Suite (Live Server)', () => {
  beforeAll(async () => {
    // Login all test accounts
    [
      studentToken,
      student2Token,
      hodCsToken,
      hodEceToken,
      principalToken,
      safetyOfficerToken,
    ] = await Promise.all([
      login('student@safeher.test'),
      login('student2@safeher.test'),
      login('hod.cs@safeher.test'),
      login('hod.ece@safeher.test'),
      login('principal@safeher.test'),
      login('safetyofficer@safeher.test'),
    ]);

    // Resolve IDs via Principal (can see everything)
    const all = await getComplaints(principalToken);
    expect(all.status).toBe(200);
    const list = all.data?.data ?? all.data ?? [];

    const cse101 = list.find((c: any) => c.publicComplaintNumber === 'CMP-2026-000101');
    const ece103 = list.find((c: any) => c.publicComplaintNumber === 'CMP-2026-000103');
    const restricted106 = list.find((c: any) => c.publicComplaintNumber === 'CMP-2026-000106');
    const st2_104 = list.find((c: any) => c.publicComplaintNumber === 'CMP-2026-000104');

    expect(cse101).toBeDefined();
    expect(ece103).toBeDefined();
    expect(restricted106).toBeDefined();
    expect(st2_104).toBeDefined();

    cseComplaintId = cse101.id;
    eceComplaintId = ece103.id;
    restrictedComplaintId = restricted106.id;
    student2ComplaintId = st2_104.id;

    // Resolve EEE department ID from student2's complaint
    eeDepartmentId = st2_104.departmentId;
    expect(eeDepartmentId).toBeDefined();

    console.log('✅ Test tokens obtained. Complaint IDs resolved. Starting security checks...');
  }, 30000);

  // ─── 1. Student Boundaries ──────────────────────────────────────────────────

  describe('1. Student Role Security', () => {
    it('Student CANNOT update complaint status → 403', async () => {
      const res = await http.patch(
        `/complaints/${cseComplaintId}/status`,
        { status: 'RESOLVED', reasonComment: 'Unauthorized attempt' },
        { headers: { Authorization: `Bearer ${studentToken}` } },
      );
      expect(res.status).toBe(403);
    });

    it('Student CANNOT transfer complaint → 403', async () => {
      const res = await http.post(
        `/complaints/${cseComplaintId}/transfer`,
        { destinationDepartmentId: eeDepartmentId, reason: 'Unauthorized attempt' },
        { headers: { Authorization: `Bearer ${studentToken}` } },
      );
      expect(res.status).toBe(403);
    });

    it('Student CANNOT create administrative tasks → 403', async () => {
      const res = await http.post(
        '/tasks',
        { title: 'Unauthorized task', description: 'Test' },
        { headers: { Authorization: `Bearer ${studentToken}` } },
      );
      expect(res.status).toBe(403);
    });

    it("Student CANNOT view another student's complaint → 403", async () => {
      const res = await http.get(
        `/complaints/${student2ComplaintId}`,
        { headers: { Authorization: `Bearer ${studentToken}` } },
      );
      expect(res.status).toBe(403);
    });

    it('Student CAN view their own complaint → 200', async () => {
      const res = await http.get(
        `/complaints/${cseComplaintId}`,
        { headers: { Authorization: `Bearer ${studentToken}` } },
      );
      expect(res.status).toBe(200);
      const complaint = res.data?.data ?? res.data;
      expect(complaint.id).toBe(cseComplaintId);
    });
  });

  // ─── 2. HOD Isolation ───────────────────────────────────────────────────────

  describe('2. HOD Department Isolation', () => {
    it('HOD CSE CANNOT update ECE complaint status → 403', async () => {
      const res = await http.patch(
        `/complaints/${eceComplaintId}/status`,
        { status: 'IN_PROGRESS', reasonComment: 'Cross-dept attempt' },
        { headers: { Authorization: `Bearer ${hodCsToken}` } },
      );
      expect(res.status).toBe(403);
    });

    it('HOD CSE CANNOT transfer ECE complaint → 403', async () => {
      const res = await http.post(
        `/complaints/${eceComplaintId}/transfer`,
        { destinationDepartmentId: eeDepartmentId, reason: 'Cross-dept attempt' },
        { headers: { Authorization: `Bearer ${hodCsToken}` } },
      );
      expect(res.status).toBe(403);
    });

    it('HOD CANNOT read RESTRICTED sensitivity complaint → 403', async () => {
      const res = await http.get(
        `/complaints/${restrictedComplaintId}`,
        { headers: { Authorization: `Bearer ${hodCsToken}` } },
      );
      expect(res.status).toBe(403);
    });

    it('HOD CSE CAN view their own department complaint → 200', async () => {
      const res = await http.get(
        `/complaints/${cseComplaintId}`,
        { headers: { Authorization: `Bearer ${hodCsToken}` } },
      );
      expect(res.status).toBe(200);
      const complaint = res.data?.data ?? res.data;
      expect(complaint.id).toBe(cseComplaintId);
    });
  });

  // ─── 3. Principal Cross-Department Access ───────────────────────────────────

  describe('3. Principal Executive Oversight', () => {
    it('Principal CAN view all complaints across departments → 200', async () => {
      const res = await http.get('/complaints', {
        headers: { Authorization: `Bearer ${principalToken}` },
      });
      expect(res.status).toBe(200);
      const list = res.data?.data ?? res.data ?? [];
      expect(list.length).toBeGreaterThanOrEqual(6);
    });

    it('Principal CAN access cross-department statistics → 200', async () => {
      const res = await http.get('/complaints/stats', {
        headers: { Authorization: `Bearer ${principalToken}` },
      });
      expect(res.status).toBe(200);
      const stats = res.data?.data ?? res.data;
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('departmentsBreakdown');
      expect(stats.departmentsBreakdown.length).toBeGreaterThan(0);
    });
  });

  // ─── 4. Safety Officer ──────────────────────────────────────────────────────

  describe('4. Women Safety Officer Authority', () => {
    it('Safety Officer CAN access RESTRICTED women safety case → 200', async () => {
      const res = await http.get(
        `/complaints/${restrictedComplaintId}`,
        { headers: { Authorization: `Bearer ${safetyOfficerToken}` } },
      );
      expect(res.status).toBe(200);
      const complaint = res.data?.data ?? res.data;
      expect(complaint.id).toBe(restrictedComplaintId);
    });

    it('Safety Officer CAN view their complaint list → 200', async () => {
      const res = await http.get('/complaints', {
        headers: { Authorization: `Bearer ${safetyOfficerToken}` },
      });
      expect(res.status).toBe(200);
    });
  });

  // ─── 5. HOD ECE Authority ───────────────────────────────────────────────────

  describe('5. HOD ECE Authorised Access', () => {
    it('HOD ECE CAN view ECE department complaint → 200', async () => {
      const res = await http.get(
        `/complaints/${eceComplaintId}`,
        { headers: { Authorization: `Bearer ${hodEceToken}` } },
      );
      expect(res.status).toBe(200);
      const complaint = res.data?.data ?? res.data;
      expect(complaint.id).toBe(eceComplaintId);
    });

    it('HOD ECE CANNOT view CSE department complaint → 403', async () => {
      const res = await http.get(
        `/complaints/${cseComplaintId}`,
        { headers: { Authorization: `Bearer ${hodEceToken}` } },
      );
      expect(res.status).toBe(403);
    });
  });
});
