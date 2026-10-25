/**
 * Test integrasi endpoint GET pesan + hardening penanda baca (issue #11).
 * Route handler sungguhan; Prisma di-mock agar tidak menulis ke DB development
 * (pola yang sama dengan suite auth-otp-flow). Fokus: matriks peserta,
 * pagination (cursor, limit, nextCursor), dan envelope respons.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  store: new Map<string, { name: string; value: string }>(),
  convFindFirst: vi.fn(),
  msgFindMany: vi.fn(),
  msgUpdateMany: vi.fn(),
  profileFindUnique: vi.fn(async () => null),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [...h.store.values()],
    get: (name: string) => h.store.get(name),
    set: (name: string, value: string) => {
      h.store.set(name, { name, value });
    },
    delete: (name: string) => {
      h.store.delete(name);
    },
  })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: { findFirst: h.convFindFirst },
    message: { findMany: h.msgFindMany, updateMany: h.msgUpdateMany },
    profile: { findUnique: h.profileFindUnique },
  },
}));

import { POST as readPOST } from "@/app/api/conversations/[id]/read/route";
import { GET as messagesGET } from "@/app/api/conversations/[id]/messages/route";
import { setSessionCookie, registerLocalUser } from "@/server/user-store";
import { encodeMessageCursor, parseMessageCursor } from "@/server/message-cursor";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const CONTACT_ID = "22222222-2222-4222-8222-222222222222";
const OUTSIDER_ID = "33333333-3333-4333-8333-333333333333";
const CONV_ID = "44444444-4444-4444-8444-444444444444";
const CONV_NULL_CONTACT_ID = "55555555-5555-4555-8555-555555555555";
// Id pesan harus UUID agar kursor (createdAt, id) lolos validasi seperti di produksi.
const MSG_IDS = [
  "aaaaaaaa-0000-4000-8000-000000000001",
  "aaaaaaaa-0000-4000-8000-000000000002",
  "aaaaaaaa-0000-4000-8000-000000000003",
];

const at = (minute: number) => new Date(`2026-10-25T00:00:${String(minute).padStart(2, "0")}.000Z`);
const msg = (n: number, minute: number, senderRole: "OWNER" | "CONTACT") => ({
  id: MSG_IDS[n],
  conversationId: CONV_ID,
  senderId: senderRole === "OWNER" ? OWNER_ID : CONTACT_ID,
  senderRole,
  channel: "IN_APP",
  body: `body-${MSG_IDS[n]}`,
  readAt: null,
  createdAt: at(minute),
  deletedAt: null,
});

type Actor = { id: string; email: string; role: "owner" | "seeker" };

async function loginAs(actor: Actor) {
  h.store.clear();
  registerLocalUser({
    id: actor.id,
    email: actor.email,
    password: "irrelevant-in-test",
    fullName: `Actor ${actor.id.slice(0, 4)}`,
    role: actor.role,
  });
  await setSessionCookie({ userId: actor.id, email: actor.email });
}

const owner: Actor = { id: OWNER_ID, email: "owner@conv.test", role: "owner" };
const contact: Actor = { id: CONTACT_ID, email: "contact@conv.test", role: "seeker" };
const outsider: Actor = { id: OUTSIDER_ID, email: "outsider@conv.test", role: "seeker" };

function convFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: CONV_ID,
    ownerId: OWNER_ID,
    contactId: CONTACT_ID,
    channel: "IN_APP",
    deletedAt: null,
    ...overrides,
  };
}

function jsonOf(res: Response) {
  return res.json() as Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: { code: string; message: string };
  }>;
}

beforeEach(() => {
  h.store.clear();
  vi.clearAllMocks();
  h.profileFindUnique.mockResolvedValue(null);
});

describe("GET /api/conversations/[id]/messages", () => {
  it("returns the participant's messages ascending inside the stable envelope", async () => {
    await loginAs(owner);
    h.convFindFirst.mockResolvedValue(convFixture());
    h.msgFindMany.mockResolvedValue([msg(1, 2, "CONTACT"), msg(0, 1, "OWNER")]);

    const res = await messagesGET(new Request(`http://localhost:3000/api/conversations/${CONV_ID}/messages`), {
      params: Promise.resolve({ id: CONV_ID }),
    });
    expect(res.status).toBe(200);
    const body = await jsonOf(res);
    expect(body.success).toBe(true);
    expect((body.data!.messages as { id: string }[]).map((m) => m.id)).toEqual([MSG_IDS[0], MSG_IDS[1]]);
    expect(body.data!.nextCursor).toBeNull();
    expect((body.data!.messages as { body: string }[])[0].body).toBe(`body-${MSG_IDS[0]}`);
  });

  it("passes the descending cursor query to the data layer and clamps take to limit+1", async () => {
    await loginAs(owner);
    h.convFindFirst.mockResolvedValue(convFixture());
    h.msgFindMany.mockResolvedValue([]);
    const cursor = encodeMessageCursor({ createdAt: at(3), id: MSG_IDS[2] });

    await messagesGET(
      new Request(`http://localhost:3000/api/conversations/${CONV_ID}/messages?limit=5&cursor=${encodeURIComponent(cursor)}`),
      { params: Promise.resolve({ id: CONV_ID }) },
    );
    expect(h.msgFindMany).toHaveBeenCalledTimes(1);
    const args = h.msgFindMany.mock.calls[0][0];
    expect(args.orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
    expect(args.take).toBe(6);
    expect(args.where.conversationId).toBe(CONV_ID);
    expect(args.where.deletedAt).toBeNull();
    expect(args.where.OR).toEqual([
      { createdAt: { lt: at(3) } },
      { createdAt: at(3), id: { lt: MSG_IDS[2] } },
    ]);
  });

  it("emits nextCursor pointing at the oldest message of the page", async () => {
    await loginAs(owner);
    h.convFindFirst.mockResolvedValue(convFixture());
    h.msgFindMany.mockResolvedValue([msg(2, 3, "OWNER"), msg(1, 2, "CONTACT"), msg(0, 1, "OWNER")]);

    const res = await messagesGET(
      new Request(`http://localhost:3000/api/conversations/${CONV_ID}/messages?limit=2`),
      { params: Promise.resolve({ id: CONV_ID }) },
    );
    const body = await jsonOf(res);
    expect((body.data!.messages as { id: string }[]).map((m) => m.id)).toEqual([MSG_IDS[1], MSG_IDS[2]]);
    const parsed = parseMessageCursor(body.data!.nextCursor as string);
    expect(parsed).toEqual({ createdAt: at(2), id: MSG_IDS[1] });
  });

  it("accepts the linked contact", async () => {
    await loginAs(contact);
    h.convFindFirst.mockResolvedValue(convFixture());
    h.msgFindMany.mockResolvedValue([]);

    const res = await messagesGET(new Request(`http://localhost:3000/api/conversations/${CONV_ID}/messages`), {
      params: Promise.resolve({ id: CONV_ID }),
    });
    expect(res.status).toBe(200);
  });

  it("allows only the owner on legacy contact_id = NULL conversations", async () => {
    await loginAs(owner);
    h.convFindFirst.mockResolvedValue(convFixture({ contactId: null }));
    h.msgFindMany.mockResolvedValue([]);
    const ok = await messagesGET(
      new Request(`http://localhost:3000/api/conversations/${CONV_ID}/messages`),
      { params: Promise.resolve({ id: CONV_ID }) },
    );
    expect(ok.status).toBe(200);

    await loginAs(outsider);
    const denied = await messagesGET(
      new Request(`http://localhost:3000/api/conversations/${CONV_ID}/messages`),
      { params: Promise.resolve({ id: CONV_ID }) },
    );
    expect(denied.status).toBe(403);
    const body = await jsonOf(denied);
    expect(body.error?.code).toBe("FORBIDDEN");
    expect(body.data).toBeUndefined();
  });

  it("denies a nonparticipant without any message data", async () => {
    await loginAs(outsider);
    h.convFindFirst.mockResolvedValue(convFixture());
    const res = await messagesGET(new Request(`http://localhost:3000/api/conversations/${CONV_ID}/messages`), {
      params: Promise.resolve({ id: CONV_ID }),
    });
    expect(res.status).toBe(403);
    const body = await jsonOf(res);
    expect(body.error?.code).toBe("FORBIDDEN");
    expect(body.data).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("body-");
  });

  it("returns 404 for an unknown conversation", async () => {
    await loginAs(owner);
    h.convFindFirst.mockResolvedValue(null);
    const res = await messagesGET(new Request("http://localhost:3000/api/conversations/99999999-9999-4999-8999-999999999999/messages"), {
      params: Promise.resolve({ id: "99999999-9999-4999-8999-999999999999" }),
    });
    expect(res.status).toBe(404);
    expect((await jsonOf(res)).error?.code).toBe("NOT_FOUND");
  });

  it("rejects a page size above the maximum", async () => {
    await loginAs(owner);
    const res = await messagesGET(
      new Request(`http://localhost:3000/api/conversations/${CONV_ID}/messages?limit=200`),
      { params: Promise.resolve({ id: CONV_ID }) },
    );
    expect(res.status).toBe(422);
    expect((await jsonOf(res)).error?.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a malformed cursor", async () => {
    await loginAs(owner);
    h.convFindFirst.mockResolvedValue(convFixture());
    const res = await messagesGET(
      new Request(`http://localhost:3000/api/conversations/${CONV_ID}/messages?cursor=garbage`),
      { params: Promise.resolve({ id: CONV_ID }) },
    );
    expect(res.status).toBe(400);
    expect((await jsonOf(res)).error?.code).toBe("INVALID_CURSOR");
  });
});

describe("POST /api/conversations/[id]/read (hardened)", () => {
  it("lets the owner mark the conversation read", async () => {
    await loginAs(owner);
    h.convFindFirst.mockResolvedValue(convFixture());
    h.msgUpdateMany.mockResolvedValue({ count: 3 });

    const res = await readPOST(new Request(`http://localhost:3000/api/conversations/${CONV_ID}/read`, { method: "POST", headers: { Origin: "http://localhost:3000" } }), {
      params: Promise.resolve({ id: CONV_ID }),
    });
    expect(res.status).toBe(200);
    expect((await jsonOf(res)).data?.readCount).toBe(3);
    expect(h.msgUpdateMany).toHaveBeenCalledTimes(1);
    expect(h.msgUpdateMany.mock.calls[0][0].where.conversationId).toBe(CONV_ID);
  });

  it("denies a nonparticipant without touching readAt", async () => {
    await loginAs(outsider);
    h.convFindFirst.mockResolvedValue(convFixture());

    const res = await readPOST(new Request(`http://localhost:3000/api/conversations/${CONV_ID}/read`, { method: "POST", headers: { Origin: "http://localhost:3000" } }), {
      params: Promise.resolve({ id: CONV_ID }),
    });
    expect(res.status).toBe(403);
    expect(h.msgUpdateMany).not.toHaveBeenCalled();
  });

  it("denies a non-owner on legacy contact_id = NULL conversations", async () => {
    await loginAs(outsider);
    h.convFindFirst.mockResolvedValue(convFixture({ contactId: null }));

    const res = await readPOST(new Request(`http://localhost:3000/api/conversations/${CONV_ID}/read`, { method: "POST", headers: { Origin: "http://localhost:3000" } }), {
      params: Promise.resolve({ id: CONV_ID }),
    });
    expect(res.status).toBe(403);
    expect(h.msgUpdateMany).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown conversation", async () => {
    await loginAs(owner);
    h.convFindFirst.mockResolvedValue(null);
    const res = await readPOST(new Request("http://localhost:3000/api/conversations/99999999-9999-4999-8999-999999999999/read", { method: "POST", headers: { Origin: "http://localhost:3000" } }), {
      params: Promise.resolve({ id: "99999999-9999-4999-8999-999999999999" }),
    });
    expect(res.status).toBe(404);
    expect((await jsonOf(res)).error?.code).toBe("NOT_FOUND");
  });
});
