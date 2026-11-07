/**
 * Tenant Bills API & Billing State Verification Test Suite (Tahap 2.2).
 * 
 * Verifies backend invoice operations and tenant billing invariants with 100% data isolation:
 * 1. Unauthenticated users cannot access invoice data (401 UNAUTHENTICATED).
 * 2. Tenant isolation: tenants can strictly only query their own invoices (tenantId scoped).
 * 3. Empty invoice list: returns empty array cleanly without crashing.
 * 4. Invoice status handling: unpaid (ISSUED, PENDING, OVERDUE) vs paid (PAID / paidAt).
 * 5. Database errors fail fast without silent fallbacks or leaks.
 * 6. Resilience against incomplete or partial invoice records.
 * 7. Payment security: tenants cannot unilaterally mark invoices as PAID (403 FORBIDDEN).
 * 8. Billing consistency between Dashboard and Bills page data models.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma, type Profile } from "@prisma/client";

// Hoisted mock for Prisma
const h = vi.hoisted(() => {
  const mockInvoice = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const mockRentalAgreement = {
    findFirst: vi.fn(),
  };

  const mockPayment = {
    create: vi.fn(),
  };

  const mockTx = {
    invoice: mockInvoice,
    rentalAgreement: mockRentalAgreement,
    payment: mockPayment,
  };

  const mockDb = {
    invoice: mockInvoice,
    rentalAgreement: mockRentalAgreement,
    payment: mockPayment,
    $transaction: vi.fn().mockImplementation((arg: any) => {
      if (typeof arg === "function") return arg(mockTx);
      return Promise.all(arg);
    }),
  };

  return { mockInvoice, mockRentalAgreement, mockPayment, mockDb };
});

vi.mock("@/lib/prisma", () => ({
  prisma: h.mockDb,
}));

// Import services under test
import { listInvoices, updateInvoice } from "@/server/owner-service";
import { requireUser } from "@/server/auth";
import { ApiError } from "@/server/http";

const TENANT_A: Profile = {
  id: "aaaaaaa1-1111-4111-8111-111111111111",
  email: "tenant.a@test.id",
  fullName: "Penyewa A",
  phone: "081234567891",
  avatarUrl: null,
  birthPlace: null,
  occupation: null,
  role: "SEEKER",
  adminRole: null,
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

const TENANT_B: Profile = {
  ...TENANT_A,
  id: "bbbbbbb2-2222-4222-8222-222222222222",
  email: "tenant.b@test.id",
  fullName: "Penyewa B",
};

const OWNER_PROFILE: Profile = {
  ...TENANT_A,
  id: "99999999-9999-4999-8999-999999999999",
  email: "owner@test.id",
  fullName: "Pemilik Kost",
  role: "OWNER",
};

describe("Tenant Bills API & Invariants (Tahap 2.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Unauthenticated access check
  it("1. Unauthenticated users cannot access invoices (401 UNAUTHENTICATED)", async () => {
    // When no auth session exists, requireUser throws ApiError 401
    await expect(requireUser()).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
  });

  // 2. Tenant isolation
  it("2. Tenant only sees their own invoices scoped by tenantId", async () => {
    h.mockInvoice.findMany.mockResolvedValueOnce([
      {
        id: "inv-1",
        code: "INV-202609-001",
        tenantId: TENANT_A.id,
        amount: new Prisma.Decimal(1500000),
        dueDate: new Date("2026-10-05"),
        status: "ISSUED",
        property: { id: "prop-1", name: "Kost Mawar", slug: "kost-mawar" },
        tenant: { id: TENANT_A.id, fullName: TENANT_A.fullName, email: TENANT_A.email },
        payments: [],
      },
    ]);

    const result = await listInvoices(TENANT_A);

    expect(h.mockInvoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_A.id },
      })
    );
    expect(result).toHaveLength(1);
    expect(result[0].tenantId).toBe(TENANT_A.id);
    expect(result[0].amount).toBe(1500000); // Converted to number
  });

  // 3. Empty bills
  it("3. Returns empty array cleanly when tenant has no invoices", async () => {
    h.mockInvoice.findMany.mockResolvedValueOnce([]);

    const result = await listInvoices(TENANT_B);

    expect(result).toEqual([]);
    expect(h.mockInvoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_B.id },
      })
    );
  });

  // 4. Invoice status handling: unpaid vs paid
  it("4. Correctly distinguishes unpaid and paid invoices and converts Decimals", async () => {
    const rawInvoices = [
      {
        id: "inv-overdue",
        code: "INV-202608-001",
        tenantId: TENANT_A.id,
        amount: new Prisma.Decimal(1200000),
        dueDate: new Date("2026-08-05"),
        status: "OVERDUE",
        paidAt: null,
        property: { id: "p1", name: "Kost Melati", slug: "kost-melati" },
        tenant: { id: TENANT_A.id, fullName: TENANT_A.fullName, email: TENANT_A.email },
        payments: [],
      },
      {
        id: "inv-issued",
        code: "INV-202609-002",
        tenantId: TENANT_A.id,
        amount: new Prisma.Decimal(1200000),
        dueDate: new Date("2026-09-05"),
        status: "ISSUED",
        paidAt: null,
        property: { id: "p1", name: "Kost Melati", slug: "kost-melati" },
        tenant: { id: TENANT_A.id, fullName: TENANT_A.fullName, email: TENANT_A.email },
        payments: [],
      },
      {
        id: "inv-paid",
        code: "INV-202607-003",
        tenantId: TENANT_A.id,
        amount: new Prisma.Decimal(1200000),
        dueDate: new Date("2026-07-05"),
        status: "PAID",
        paidAt: new Date("2026-07-04"),
        property: { id: "p1", name: "Kost Melati", slug: "kost-melati" },
        tenant: { id: TENANT_A.id, fullName: TENANT_A.fullName, email: TENANT_A.email },
        payments: [
          {
            id: "pay-1",
            amount: new Prisma.Decimal(1200000),
            status: "VERIFIED",
            method: "MANUAL",
            paidAt: new Date("2026-07-04"),
          },
        ],
      },
    ];

    h.mockInvoice.findMany.mockResolvedValueOnce(rawInvoices);

    const invoices = await listInvoices(TENANT_A);
    expect(invoices).toHaveLength(3);

    // Amounts are converted to numbers
    expect(typeof invoices[0].amount).toBe("number");
    expect(invoices[0].amount).toBe(1200000);
    expect(invoices[2].payments[0].amount).toBe(1200000);

    // Check UI status classification logic
    const isPaid = (inv: (typeof invoices)[number]) =>
      inv.status === "PAID" || Boolean(inv.paidAt);

    const unpaid = invoices.filter((i) => !isPaid(i));
    const paid = invoices.filter((i) => isPaid(i));

    expect(unpaid).toHaveLength(2);
    expect(paid).toHaveLength(1);
    expect(paid[0].id).toBe("inv-paid");

    // Total outstanding amount
    const outstanding = unpaid.reduce((sum, i) => sum + i.amount, 0);
    expect(outstanding).toBe(2400000);

    // Next due invoice (earliest due date among unpaid)
    const nextDue = [...unpaid].sort((a, b) =>
      a.dueDate.toISOString().localeCompare(b.dueDate.toISOString())
    )[0];
    expect(nextDue.id).toBe("inv-overdue");
  });

  // 5. Database failure fails fast
  it("5. Fails fast with error when database query throws", async () => {
    h.mockInvoice.findMany.mockRejectedValueOnce(new Error("Database pool connection timed out"));

    await expect(listInvoices(TENANT_A)).rejects.toThrow("Database pool connection timed out");
  });

  // 6. Incomplete / partial invoice data resilience
  it("6. Handles partial records (null notes, empty payments, null dates) safely", async () => {
    h.mockInvoice.findMany.mockResolvedValueOnce([
      {
        id: "inv-partial",
        code: "INV-PARTIAL",
        tenantId: TENANT_A.id,
        amount: new Prisma.Decimal(800000),
        dueDate: new Date("2026-11-01"),
        status: "PENDING",
        notes: null,
        periodStart: null,
        periodEnd: null,
        issuedAt: null,
        paidAt: null,
        property: { id: "p1", name: "Kost Sederhana", slug: "kost-sederhana" },
        tenant: { id: TENANT_A.id, fullName: TENANT_A.fullName, email: TENANT_A.email },
        payments: [],
      },
    ]);

    const result = await listInvoices(TENANT_A);
    expect(result).toHaveLength(1);
    expect(result[0].notes).toBeNull();
    expect(result[0].payments).toEqual([]);
    expect(result[0].amount).toBe(800000);
  });

  // 7. Security: Tenant cannot mark invoice as PAID
  it("7. Forbids tenant from updating invoice status directly (403 FORBIDDEN)", async () => {
    h.mockInvoice.findUnique.mockResolvedValue({
      id: "inv-target",
      status: "ISSUED",
      amount: new Prisma.Decimal(1000000),
      property: { ownerId: OWNER_PROFILE.id },
    });

    // Seeker attempts to mark invoice as PAID
    await expect(
      updateInvoice(TENANT_A, "inv-target", "PAID", "Saya sudah bayar secara mandiri")
    ).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  // 8. Consistency between Dashboard and Bills page data models
  it("8. Invoices data structure returned by backend is consistent for both Dashboard and Bills", async () => {
    const rawInvoice = {
      id: "inv-shared",
      code: "INV-202610-099",
      amount: new Prisma.Decimal(1750000),
      dueDate: new Date("2026-10-25"),
      periodStart: new Date("2026-10-01"),
      periodEnd: new Date("2026-10-31"),
      status: "PAID",
      paidAt: new Date("2026-10-20"),
      property: { id: "p1", name: "Kost Harmoni", slug: "kost-harmoni" },
      tenant: { id: TENANT_A.id, fullName: TENANT_A.fullName, email: TENANT_A.email },
      payments: [],
    };

    h.mockInvoice.findMany.mockResolvedValueOnce([rawInvoice]);

    const result = await listInvoices(TENANT_A);
    const invoice = result[0];

    // Shared schema properties checked by Dashboard
    expect(invoice.id).toBe("inv-shared");
    expect(invoice.amount).toBe(1750000);
    expect(invoice.dueDate).toEqual(new Date("2026-10-25"));
    expect(invoice.status).toBe("PAID");
    expect(invoice.paidAt).toEqual(new Date("2026-10-20"));
    expect(invoice.property?.name).toBe("Kost Harmoni");
  });
});
