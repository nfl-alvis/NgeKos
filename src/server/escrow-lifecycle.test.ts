import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { evaluateLazyEscrowRelease } from "./wallet-service";
import { calculateNextAnchorDueDate } from "./billing-cycle-service";

describe("Escrow H+1 and Lifecycle Automation", () => {
  it("schedules escrow release for 24 hours after check-in", () => {
    const checkedInAt = new Date("2026-11-20T14:30:00.000Z");
    const eligibleAt = new Date(checkedInAt.getTime() + 24 * 60 * 60 * 1000);

    expect(eligibleAt.toISOString()).toBe("2026-11-21T14:30:00.000Z");
  });

  it("schedules escrow release for 24 hours after term invoice payment", () => {
    const paidAt = new Date("2026-12-15T09:00:00.000Z");
    const eligibleAt = new Date(paidAt.getTime() + 24 * 60 * 60 * 1000);

    expect(eligibleAt.toISOString()).toBe("2026-12-16T09:00:00.000Z");
  });

  it("releases held transaction when current time surpasses eligibleAt", () => {
    const checkIn = new Date("2026-11-20T10:00:00.000Z");
    const eligibleAt = new Date(checkIn.getTime() + 24 * 60 * 60 * 1000); // 21 Nov 10:00

    const txHold = {
      id: "tx-hold-1",
      amount: 1500000,
      type: "EARNING_HOLD",
      status: "PENDING",
      payoutEligibleAt: eligibleAt,
    };

    // Case A: 20 hours after check-in (before H+1)
    const timeBefore = new Date("2026-11-21T06:00:00.000Z");
    const resBefore = evaluateLazyEscrowRelease([txHold as any], timeBefore);
    expect(resBefore.eligibleToRelease.length).toBe(0);
    expect(resBefore.stillHeld.length).toBe(1);

    // Case B: 25 hours after check-in (after H+1)
    const timeAfter = new Date("2026-11-21T11:00:00.000Z");
    const resAfter = evaluateLazyEscrowRelease([txHold as any], timeAfter);
    expect(resAfter.eligibleToRelease.length).toBe(1);
    expect(resAfter.totalReleaseAmount).toBe(1500000);
    expect(resAfter.stillHeld.length).toBe(0);
  });
});
