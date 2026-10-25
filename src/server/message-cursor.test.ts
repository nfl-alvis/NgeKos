import { describe, expect, it } from "vitest";
import {
  encodeMessageCursor,
  messagePageWhere,
  parseMessageCursor,
} from "./message-cursor";

const row = (createdAt: string, id: string) => ({ createdAt: new Date(createdAt), id });

describe("message cursor", () => {
  it("round-trips encode/parse", () => {
    const original = row("2026-10-25T04:16:30.123Z", "0b6e2f1a-1111-4222-8333-444455556666");
    const parsed = parseMessageCursor(encodeMessageCursor(original));
    expect(parsed).toEqual(original);
  });

  it("rejects malformed cursors", () => {
    expect(parseMessageCursor("garbage")).toBeNull();
    expect(parseMessageCursor("2026-10-25T04:16:30.123Z~not-a-uuid")).toBeNull();
    expect(parseMessageCursor("2026-10-25T04:16:30Z~0b6e2f1a-1111-4222-8333-444455556666")).toBeNull();
    expect(parseMessageCursor("9999-99-99T99:99:99.999Z~0b6e2f1a-1111-4222-8333-444455556666")).toBeNull();
  });

  it("builds the (createdAt, id) where clause", () => {
    const c = { createdAt: new Date("2026-10-25T00:00:00.000Z"), id: "a3" };
    expect(messagePageWhere(c)).toEqual({
      OR: [
        { createdAt: { lt: c.createdAt } },
        { createdAt: c.createdAt, id: { lt: "a3" } },
      ],
    });
  });

  it("pages a timeline with identical timestamps without gaps or duplicates", () => {
    // 5 baris dengan createdAt identik + id beragam, plus dua hari sebelumnya.
    const T = "2026-10-25T00:00:00.000Z";
    const rows = [
      row(T, "a1"),
      row(T, "a2"),
      row(T, "a3"),
      row(T, "a4"),
      row(T, "a5"),
      row("2026-10-24T00:00:00.000Z", "b1"),
      row("2026-10-23T00:00:00.000Z", "c1"),
    ];
    // Urutan DB: (createdAt desc, id desc)
    const sorted = [...rows].sort((x, y) =>
      y.createdAt.getTime() - x.createdAt.getTime() || (x.id < y.id ? 1 : x.id > y.id ? -1 : 0),
    );
    // Predikat halaman yang sama dengan messagePageWhere, dievaluasi manual.
    const olderThan = (r: { createdAt: Date; id: string }, c: { createdAt: Date; id: string }) =>
      r.createdAt.getTime() < c.createdAt.getTime() ||
      (r.createdAt.getTime() === c.createdAt.getTime() && r.id < c.id);

    const pageSize = 2;
    let cursor: { createdAt: Date; id: string } | null = null;
    const seen: string[] = [];
    for (;;) {
      const remaining = sorted.filter((r) => !cursor || olderThan(r, cursor));
      const hasMore = remaining.length > pageSize;
      const page = remaining.slice(0, pageSize);
      if (page.length === 0) break;
      seen.push(...page.map((r) => r.id));
      if (!hasMore) break;
      cursor = page[page.length - 1];
    }
    // Semua baris tertangani persis sekali, dalam urutan DB.
    expect(seen).toEqual(sorted.map((r) => r.id));
  });
});
