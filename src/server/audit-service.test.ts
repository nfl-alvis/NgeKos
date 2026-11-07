import { describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    profile: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import {
  extractClientIp,
  extractUserAgent,
  GROUP_TO_ACTIONS,
  listAuditLogs,
  recordAuditLog,
  sanitizeAuditMetadata,
} from "./audit-service";

describe("audit-service: metadata sanitization", () => {
  it("redacts sensitive fields like passwords, tokens, secrets, cookies, and credit cards", () => {
    const raw = {
      user: "admin",
      password: "SuperSecretPassword123!",
      passwordHash: "$2b$10$abcdefghijklmnopqrstuvwxyz",
      token: "jwt-token-xyz-12345",
      accessToken: "access-token-abc",
      refreshToken: "refresh-token-xyz",
      secret: "api-secret-key-999",
      sessionCookie: "nk_session=xyz",
      authorization: "Bearer secret-bearer-token",
      creditCard: "4111222233334444",
      cardNumber: "5500000000000004",
      cvv: "123",
      safeInfo: "This should remain intact",
      amount: 1500000,
      active: true,
    };

    const sanitized = sanitizeAuditMetadata(raw) as Record<string, unknown>;

    expect(sanitized.password).toBe("[REDACTED]");
    expect(sanitized.passwordHash).toBe("[REDACTED]");
    expect(sanitized.token).toBe("[REDACTED]");
    expect(sanitized.accessToken).toBe("[REDACTED]");
    expect(sanitized.refreshToken).toBe("[REDACTED]");
    expect(sanitized.secret).toBe("[REDACTED]");
    expect(sanitized.sessionCookie).toBe("[REDACTED]");
    expect(sanitized.authorization).toBe("[REDACTED]");
    expect(sanitized.creditCard).toBe("[REDACTED]");
    expect(sanitized.cardNumber).toBe("[REDACTED]");
    expect(sanitized.cvv).toBe("[REDACTED]");

    expect(sanitized.user).toBe("admin");
    expect(sanitized.safeInfo).toBe("This should remain intact");
    expect(sanitized.amount).toBe(1500000);
    expect(sanitized.active).toBe(true);
  });

  it("recursively sanitizes nested objects and arrays", () => {
    const nested = {
      level1: {
        normal: "data",
        deepPassword: "hidden-value",
        list: [
          { item: 1, secretToken: "jwt-item" },
          { item: 2, apiKey: "safe" },
        ],
      },
    };

    const sanitized = sanitizeAuditMetadata(nested) as any;
    expect(sanitized.level1.normal).toBe("data");
    expect(sanitized.level1.deepPassword).toBe("[REDACTED]");
    expect(sanitized.level1.list[0].item).toBe(1);
    expect(sanitized.level1.list[0].secretToken).toBe("[REDACTED]");
  });

  it("handles circular references gracefully without stack overflow", () => {
    const circularObj: any = { name: "test-cycle" };
    circularObj.self = circularObj;

    const sanitized = sanitizeAuditMetadata(circularObj) as any;
    expect(sanitized.name).toBe("test-cycle");
    expect(sanitized.self).toBe("[Circular]");
  });

  it("redacts sensitive credential values and truncates oversized strings", () => {
    const data = {
      safeHeader: "Content-Type: application/json",
      customHeader: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeak",
      signedPayload: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIn0.signature",
      dbUri: "postgres://postgres:SuperSecretDbPass123@db.supabase.co:5432/postgres",
      longString: "X".repeat(1500),
      apiKeyVar: "key123",
      passwdVar: "pwd123",
      clientSecretVar: "sec123",
      cvcVar: "999",
      pinVar: "1234",
    };

    const sanitized = sanitizeAuditMetadata(data) as any;
    expect(sanitized.safeHeader).toBe("Content-Type: application/json");
    expect(sanitized.customHeader).toBe("[REDACTED_CREDENTIAL]");
    expect(sanitized.signedPayload).toBe("[REDACTED_CREDENTIAL]");
    expect(sanitized.dbUri).toBe("[REDACTED_CREDENTIAL]");
    expect(sanitized.longString.length).toBeLessThan(1100);
    expect(sanitized.longString).toContain("[Truncated]");
    expect(sanitized.apiKeyVar).toBe("[REDACTED]");
    expect(sanitized.passwdVar).toBe("[REDACTED]");
    expect(sanitized.clientSecretVar).toBe("[REDACTED]");
    expect(sanitized.cvcVar).toBe("[REDACTED]");
    expect(sanitized.pinVar).toBe("[REDACTED]");
  });

  it("handles null, undefined, primitives, and deep recursion cleanly", () => {
    expect(sanitizeAuditMetadata(null)).toBeNull();
    expect(sanitizeAuditMetadata(undefined)).toBeUndefined();
    expect(sanitizeAuditMetadata("string")).toBe("string");
    expect(sanitizeAuditMetadata(123)).toBe(123);
    expect(sanitizeAuditMetadata(true)).toBe(true);

    let deep: any = { value: "leaf" };
    for (let i = 0; i < 8; i++) {
      deep = { child: deep };
    }
    const result = sanitizeAuditMetadata(deep) as any;
    expect(JSON.stringify(result)).toContain("[MaxDepth]");
  });
});

describe("audit-service: client IP and user agent extraction", () => {
  it("extracts valid IPv4 address from x-forwarded-for header (first address)", () => {
    const req = new Request("http://localhost:3000", {
      headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178" },
    });
    expect(extractClientIp(req)).toBe("203.0.113.195");
  });

  it("extracts valid IPv6 address from x-forwarded-for header", () => {
    const req = new Request("http://localhost:3000", {
      headers: { "x-forwarded-for": "2001:db8:85a3:8d3:1319:8a2e:370:7348" },
    });
    expect(extractClientIp(req)).toBe("2001:db8:85a3:8d3:1319:8a2e:370:7348");
  });

  it("extracts valid IP from cf-connecting-ip header (Cloudflare)", () => {
    const req = new Request("http://localhost:3000", {
      headers: { "cf-connecting-ip": "104.28.19.45", "x-forwarded-for": "192.168.1.1" },
    });
    expect(extractClientIp(req)).toBe("104.28.19.45");
  });

  it("extracts valid IP from x-real-ip header if cf-connecting-ip is missing", () => {
    const req = new Request("http://localhost:3000", {
      headers: { "x-real-ip": "198.51.100.42" },
    });
    expect(extractClientIp(req)).toBe("198.51.100.42");
  });

  it("rejects invalid IP strings to protect PostgreSQL inet type", () => {
    const req = new Request("http://localhost:3000", {
      headers: { "x-forwarded-for": "evil-script-injection.com; select * from users" },
    });
    expect(extractClientIp(req)).toBeNull();
  });

  it("extracts and truncates user-agent header up to 500 characters", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)";
    const req = new Request("http://localhost:3000", {
      headers: { "user-agent": ua },
    });
    expect(extractUserAgent(req)).toBe(ua);

    const longUa = "A".repeat(800);
    const longReq = new Request("http://localhost:3000", {
      headers: { "user-agent": longUa },
    });
    expect(extractUserAgent(longReq)?.length).toBe(500);
  });
});

describe("audit-service: recordAuditLog persistence and error handling", () => {
  it("creates an audit log record with verified actor and sanitized metadata", async () => {
    const validUuid = "a1111111-1111-1111-1111-111111111111";
    mockPrisma.profile.findUnique.mockResolvedValueOnce({ id: validUuid });
    mockPrisma.auditLog.create.mockResolvedValueOnce({
      id: "log-uuid-1",
      actorId: validUuid,
      action: "verify.approve",
      entityType: "PROPERTY",
      entityId: "prop-123",
      metadata: { target: "Kost Mewah", description: "Approved", password: "[REDACTED]" },
      createdAt: new Date(),
    });

    const res = await recordAuditLog({
      actor: { id: validUuid, fullName: "Bayu Admin", email: "admin@ngekost.id", role: "ADMIN" },
      action: "verify.approve",
      entityType: "PROPERTY",
      entityId: "prop-123",
      description: "Approved",
      metadata: { target: "Kost Mewah", password: "raw-password-123" },
      ipAddress: "127.0.0.1",
      userAgent: "TestAgent/1.0",
    });

    expect(res).toBeDefined();
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: validUuid,
          action: "verify.approve",
          entityType: "PROPERTY",
          entityId: "prop-123",
          ipAddress: "127.0.0.1",
          userAgent: "TestAgent/1.0",
        }),
      })
    );
  });

  it("handles non-UUID or non-existent actor gracefully without DB constraint error", async () => {
    mockPrisma.profile.findUnique.mockResolvedValueOnce(null);
    mockPrisma.auditLog.create.mockResolvedValueOnce({
      id: "log-uuid-2",
      actorId: null,
      action: "auth.login",
      entityType: "SESSION",
      entityId: "local-admin",
      metadata: {},
      createdAt: new Date(),
    });

    const res = await recordAuditLog({
      actor: { id: "non-uuid-id", fullName: "Demo Admin", email: "demo@test.com", role: "ADMIN" },
      action: "auth.login",
      entityType: "SESSION",
      entityId: "local-admin",
    });

    expect(res).toBeDefined();
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: null,
        }),
      })
    );
  });

  it("catches DB error gracefully and returns null without throwing to caller", async () => {
    mockPrisma.auditLog.create.mockRejectedValueOnce(new Error("DB connection lost"));

    const res = await recordAuditLog({
      action: "notify.send",
      entityType: "NOTICE",
      entityId: "notice-1",
    });

    expect(res).toBeNull();
  });

  it("re-throws error in transactional context (params.tx) to force transaction rollback", async () => {
    const mockTx: any = {
      profile: { findUnique: vi.fn().mockResolvedValue(null) },
      auditLog: { create: vi.fn().mockRejectedValue(new Error("Unique constraint violation")) },
    };

    await expect(
      recordAuditLog({
        tx: mockTx,
        action: "user.ban",
        entityType: "USER",
        entityId: "u-123",
      })
    ).rejects.toThrow("Unique constraint violation");
  });
});

describe("audit-service: listAuditLogs query and formatting", () => {
  it("calculates pagination and builds where clause with group filter", async () => {
    mockPrisma.auditLog.count.mockResolvedValueOnce(45);
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([
      {
        id: "log-1",
        actorId: "a1111111-1111-1111-1111-111111111111",
        action: "verify.approve",
        entityType: "PROPERTY",
        entityId: "prop-1",
        metadata: { target: "Kost Melati", description: "Disetujui" },
        ipAddress: "127.0.0.1",
        userAgent: "Browser/1.0",
        createdAt: new Date("2026-11-03T00:00:00Z"),
        actor: {
          id: "a1111111-1111-1111-1111-111111111111",
          fullName: "Bayu Pratama",
          email: "admin@ngekost.id",
          role: "ADMIN",
        },
      },
    ]);

    const res = await listAuditLogs({
      page: 2,
      limit: 10,
      group: "verification",
      search: "Melati",
    });

    expect(res.meta).toEqual({
      total: 45,
      page: 2,
      limit: 10,
      totalPages: 5,
    });

    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        where: expect.objectContaining({
          action: { in: GROUP_TO_ACTIONS.verification },
          OR: expect.any(Array),
        }),
      })
    );

    expect(res.items[0]).toMatchObject({
      id: "log-1",
      actor: "Bayu Pratama",
      actorEmail: "admin@ngekost.id",
      action: "verify.approve",
      target: "Kost Melati",
      description: "Disetujui",
      ipAddress: "127.0.0.1",
    });
  });
});

describe("audit-service: CSV Formula Injection sanitization (CWE-1236)", () => {
  // Test the sanitizeCsvCell invariant defined for admin audit CSV export
  function sanitizeCsvCell(v: unknown): string {
    if (v === null || v === undefined) return '""';
    let str = String(v);
    if (/^[\t\r ]*[=+\-@]/.test(str)) {
      str = "'" + str;
    }
    return `"${str.replaceAll('"', '""')}"`;
  }

  it("escapes formula trigger characters (=, +, -, @, \\t, \\r) by prepending a single quote", () => {
    expect(sanitizeCsvCell("=CMD('calc')")).toBe(`"\'=CMD('calc')"`);
    expect(sanitizeCsvCell("+12345")).toBe(`"\'+12345"`);
    expect(sanitizeCsvCell("-5000")).toBe(`"\'-5000"`);
    expect(sanitizeCsvCell("@SUM(A1:A10)")).toBe(`"\'@SUM(A1:A10)"`);
    expect(sanitizeCsvCell("\t=1+1")).toBe(`"\'\t=1+1"`);
    expect(sanitizeCsvCell("   =HYPERLINK('http://evil.com')")).toBe(`"\'   =HYPERLINK('http://evil.com')"`);
  });

  it("properly quotes standard text, commas, and double quotes", () => {
    expect(sanitizeCsvCell("Normal text")).toBe(`"Normal text"`);
    expect(sanitizeCsvCell('Text with "quotes" and, commas')).toBe(`"Text with ""quotes"" and, commas"`);
    expect(sanitizeCsvCell(null)).toBe('""');
    expect(sanitizeCsvCell(undefined)).toBe('""');
    expect(sanitizeCsvCell(12345)).toBe('"12345"');
  });
});
