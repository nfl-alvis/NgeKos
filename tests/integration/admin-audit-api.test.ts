import { beforeEach, describe, expect, it, vi } from "vitest";
import { type Profile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAuditLog, listAuditLogs } from "@/server/audit-service";
import { ApiError } from "@/server/http";

// Hoisted mocks for auth
const { authState } = vi.hoisted(() => ({
  authState: {
    currentProfile: null as Profile | null,
  },
}));

vi.mock("@/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/auth")>();
  return {
    ...actual,
    requireUser: vi.fn().mockImplementation(async (allowedRoles?: readonly string[]) => {
      if (!authState.currentProfile) {
        throw new ApiError(401, "UNAUTHENTICATED", "Please sign in first");
      }
      if (allowedRoles && !allowedRoles.includes(authState.currentProfile.role)) {
        throw new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action");
      }
      return {
        authUser: { id: authState.currentProfile.id, email: authState.currentProfile.email },
        profile: authState.currentProfile,
      };
    }),
    getAuthContext: vi.fn().mockImplementation(async () => {
      if (!authState.currentProfile) return null;
      return {
        authUser: { id: authState.currentProfile.id, email: authState.currentProfile.email },
        profile: authState.currentProfile,
      };
    }),
  };
});

describe("Admin Audit Log API & Security Invariants", () => {
  const adminProfile: Profile = {
    id: "a1111111-1111-1111-1111-111111111111",
    email: "admin@ngekost.id",
    fullName: "Bayu Pratama (Admin Demo)",
    phone: "08123456789",
    avatarUrl: null,
    birthPlace: null,
    occupation: null,
    role: "ADMIN",
    adminRole: "SUPER",
    status: "ACTIVE",
    locale: "id",
    emailNotifications: true,
    pushNotifications: true,
    marketingNotifications: false,
    telegramChatId: null,
    telegramUsername: null,
    telegramConnectedAt: null,
    telegramConnectToken: null,
    telegramConnectTokenExpiresAt: null,
    lastSeenAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const seekerProfile: Profile = {
    ...adminProfile,
    id: "e2e00000-0000-4000-8000-000000000001",
    email: "seeker@ngekost.id",
    fullName: "Budi Seeker",
    role: "SEEKER",
    adminRole: null,
  };

  const ownerProfile: Profile = {
    ...adminProfile,
    id: "58983471-0904-40df-beb8-3a51888b176b",
    email: "owner@ngekost.id",
    fullName: "Ratri Owner",
    role: "OWNER",
    adminRole: null,
  };

  beforeEach(() => {
    authState.currentProfile = null;
  });

  it("1. Unauthenticated request to GET /api/admin/audit is rejected with 401 UNAUTHENTICATED", async () => {
    authState.currentProfile = null;

    const { GET } = await import("@/app/api/admin/audit/route");
    const req = new Request("http://localhost:3000/api/admin/audit");

    const res = await GET(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("2. Non-admin request (SEEKER) to GET /api/admin/audit is rejected with 403 FORBIDDEN", async () => {
    authState.currentProfile = seekerProfile;

    const { GET } = await import("@/app/api/admin/audit/route");
    const req = new Request("http://localhost:3000/api/admin/audit");

    const res = await GET(req);
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("3. Non-admin request (OWNER) to GET /api/admin/audit is rejected with 403 FORBIDDEN", async () => {
    authState.currentProfile = ownerProfile;

    const { GET } = await import("@/app/api/admin/audit/route");
    const req = new Request("http://localhost:3000/api/admin/audit");

    const res = await GET(req);
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("4. Admin request returns 200 with paginated audit logs structure", async () => {
    authState.currentProfile = adminProfile;

    const { GET } = await import("@/app/api/admin/audit/route");
    const req = new Request("http://localhost:3000/api/admin/audit?page=1&limit=10");

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta).toMatchObject({
      page: 1,
      limit: 10,
      total: expect.any(Number),
      totalPages: expect.any(Number),
    });
  });

  it("5. Persistent storage in PostgreSQL: recordAuditLog writes to DB, listAuditLogs reads it back with sanitization", async () => {
    const testAction = `test.audit.${Date.now()}`;
    const testEntityId = `entity-${Date.now()}`;

    // Write to PostgreSQL
    const created = await recordAuditLog({
      actor: adminProfile,
      action: testAction,
      entityType: "PROPERTY",
      entityId: testEntityId,
      description: "Admin verified test property",
      metadata: {
        target: "Kost Teratai E2E",
        secretToken: "must-be-redacted",
        password: "raw-secret-password",
        price: 2500000,
      },
      ipAddress: "127.0.0.1",
      userAgent: "IntegrationTestRunner/1.0",
    });

    expect(created).toBeDefined();
    expect(created?.id).toBeTruthy();

    try {
      // Read back via listAuditLogs with action filter
      const listRes = await listAuditLogs({
        action: testAction,
      });

      expect(listRes.items.length).toBeGreaterThanOrEqual(1);
      const found = listRes.items.find((item) => item.action === testAction);
      expect(found).toBeDefined();
      expect(found?.actor).toBe(adminProfile.fullName);
      expect(found?.actorEmail).toBe(adminProfile.email);
      expect(found?.target).toBe("Kost Teratai E2E");
      expect(found?.ipAddress).toBe("127.0.0.1");
      expect(found?.userAgent).toBe("IntegrationTestRunner/1.0");

      // Verify metadata was sanitized before persistence
      expect(found?.metadata?.secretToken).toBe("[REDACTED]");
      expect(found?.metadata?.password).toBe("[REDACTED]");
      expect(found?.metadata?.price).toBe(2500000);
    } finally {
      // Clean up test entry
      const p = prisma;
      await p.auditLog.deleteMany({
        where: { action: testAction },
      });
    }
  });

  it("6. Filter parameters (group, search, pagination) correctly shape query results", async () => {
    const actionA = `verify.approve`;
    const actionB = `notify.send`;
    const tag = `test-tag-${Date.now()}`;

    const created1 = await recordAuditLog({
      actor: adminProfile,
      action: actionA,
      entityType: "PROPERTY",
      entityId: `p-${tag}`,
      metadata: { target: `Property ${tag}` },
    });

    const created2 = await recordAuditLog({
      actor: adminProfile,
      action: actionB,
      entityType: "NOTICE",
      entityId: `n-${tag}`,
      metadata: { target: `Notice ${tag}` },
    });

    try {
      // Group filter: verification should include actionA but NOT actionB
      const verifResult = await listAuditLogs({
        group: "verification",
        search: tag,
      });

      expect(verifResult.items.some((i) => i.action === actionA)).toBe(true);
      expect(verifResult.items.some((i) => i.action === actionB)).toBe(false);

      // Search filter: searching for tag should find both
      const searchResult = await listAuditLogs({
        search: tag,
      });
      expect(searchResult.items.length).toBeGreaterThanOrEqual(2);
    } finally {
      const p = prisma;
      await p.auditLog.deleteMany({
        where: {
          OR: [{ entityId: `p-${tag}` }, { entityId: `n-${tag}` }],
        },
      });
    }
  });

  it("7. Client cannot forge actor identity: actor comes from session context, not from client payload", async () => {
    authState.currentProfile = adminProfile;

    // Simulate calling PATCH /api/admin/users/[id]
    const { PATCH } = await import("@/app/api/admin/users/[id]/route");

    // Client attempts to spoof actor in request headers/body
    const fakeActorId = "e2e00000-0000-4000-8000-999999999999";
    const req = new Request(`http://localhost:3000/api/admin/users/${seekerProfile.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        "x-fake-actor-id": fakeActorId,
      },
      body: JSON.stringify({
        status: "ACTIVE",
        actorId: fakeActorId,
        actorRole: "SUPER_GOD_MODE",
      }),
    });

    const context = { params: Promise.resolve({ id: seekerProfile.id }) };
    const res = await PATCH(req, context);
    expect(res.status).toBe(200);

    // Verify in DB that the audit log recorded Bayu Pratama (adminProfile), NOT the forged actor
    const recentLogs = await listAuditLogs({
      entityType: "USER",
      actorId: adminProfile.id,
      limit: 5,
    });

    expect(recentLogs.items.length).toBeGreaterThan(0);
    const log = recentLogs.items[0];
    expect(log.actor).toBe(adminProfile.fullName);
    expect(log.actorId).toBe(adminProfile.id);
    expect(log.actorId).not.toBe(fakeActorId);
  });

  it("8. Rejects inverted date ranges (startDate > endDate) with 422 VALIDATION_ERROR", async () => {
    authState.currentProfile = adminProfile;

    const { GET } = await import("@/app/api/admin/audit/route");
    const req = new Request("http://localhost:3000/api/admin/audit?startDate=2026-12-31&endDate=2026-01-01");

    const res = await GET(req);
    expect(res.status).toBe(422);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
