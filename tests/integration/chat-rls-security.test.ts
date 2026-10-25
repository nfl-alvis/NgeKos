/**
 * Test keamanan RLS (issue #12 / spec #10): policy SELECT-only pada
 * `conversations`/`messages` diverifikasi sebagai role klien `authenticated`
 * dengan JWT Supabase ASLI (bukan koneksi Prisma berhak istimewa — Prisma hanya
 * menyiapkan fixture dan membersihkannya).
 *
 * Skenario: 3 user test (owner, contact, outsider) dibuat via REST GoTrue
 * dengan inbox email temp (mail.tm); OTP dipakai untuk mengonfirmasi agar JWT
 * sah. Fixture percakapan: (A) owner+contact, (B) legacy Telegram
 * (`contact_id` NULL, hanya owner).
 *
 * Keterbatasan dikenal: user auth percobaan tidak dapat dihapus otomatis
 * (SUPABASE_SECRET_KEY ditolak admin API — issue #4); fixture database
 * (profiles/conversations/messages) dibersihkan di afterAll.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createTempInbox,
  randomSuffix,
  readMessage,
  waitForMessage,
  type TempInbox,
} from "../helpers/mailtm";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const PASSWORD = `Rls${randomSuffix()}!a`;

const mailTmReachable = await fetch("https://api.mail.tm/domains?page=1")
  .then((res) => res.ok)
  .catch(() => false);

interface TestUser {
  id: string;
  email: string;
  accessToken: string;
  inbox: TempInbox;
}

async function rest(path: string, init: RequestInit): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    ...init,
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  return { status: res.status, json: text ? (JSON.parse(text) as Record<string, unknown>) : {} };
}

async function createVerifiedUser(label: string): Promise<TestUser> {
  const inbox = await createTempInbox(`rls-${label}`);
  const signup = await rest("/signup", {
    method: "POST",
    body: JSON.stringify({
      email: inbox.address,
      password: PASSWORD,
      data: { full_name: `RLS ${label}`, role: label === "owner" ? "owner" : "seeker", locale: "id" },
    }),
  });
  expect(signup.status).toBe(200);

  const mail = await waitForMessage(inbox, `rls-otp-${label}`);
  const msg = await readMessage(inbox, mail.id);
  const codes = (msg.text ?? "").match(/(?<![\d-])\d{8}(?![\d-])/g) ?? [];
  const code = codes[0];
  expect(code).toMatch(/^\d{8}$/);

  const verify = await rest("/verify", {
    method: "POST",
    body: JSON.stringify({ type: "signup", email: inbox.address, token: code }),
  });
  expect(verify.status).toBe(200);
  const accessToken = verify.json.access_token as string;
  const userId = ((verify.json.user as Record<string, unknown> | undefined)?.id ?? verify.json.id) as string;
  expect(accessToken).toBeTruthy();
  expect(userId).toBeTruthy();
  return { id: userId, email: inbox.address, accessToken, inbox };
}

async function restTable(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  table: string,
  query: string,
  jwt: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; json: unknown }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

describe.skipIf(!mailTmReachable || !SUPABASE_URL)("chat RLS security (real client JWTs)", () => {
  let owner: TestUser;
  let contact: TestUser;
  let outsider: TestUser;
  let convLinked: string;
  let convLegacy: string;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    owner = await createVerifiedUser("owner");
    contact = await createVerifiedUser("contact");
    outsider = await createVerifiedUser("outsider");
    createdUserIds.push(owner.id, contact.id, outsider.id);

    // Trigger Supabase mungkin sudah membuat profile saat signup; upsert aman.
    for (const u of [owner, contact, outsider]) {
      await prisma.profile.upsert({
        where: { id: u.id },
        create: {
          id: u.id,
          email: u.email,
          fullName: `RLS Test ${u.id.slice(0, 4)}`,
          role: u === owner ? "OWNER" : "SEEKER",
          status: "ACTIVE",
        },
        update: {},
      });
    }

    const convLinkedRow = await prisma.conversation.create({
      data: { ownerId: owner.id, contactId: contact.id, channel: "IN_APP" },
    });
    convLinked = convLinkedRow.id;
    await prisma.message.createMany({
      data: [
        { conversationId: convLinked, senderId: owner.id, senderRole: "OWNER", channel: "IN_APP", body: "owner-message-A" },
        { conversationId: convLinked, senderId: contact.id, senderRole: "CONTACT", channel: "IN_APP", body: "contact-message-A" },
      ],
    });

    const convLegacyRow = await prisma.conversation.create({
      data: { ownerId: owner.id, contactId: null, channel: "TELEGRAM", externalName: "Legacy Telegram" },
    });
    convLegacy = convLegacyRow.id;
    await prisma.message.create({
      data: { conversationId: convLegacy, senderRole: "OWNER", channel: "TELEGRAM", body: "legacy-telegram-message" },
    });
  }, 300_000);

  afterAll(async () => {
    // Fixture DB dibersihkan; user auth dibiarkan (issue #4: admin API 403).
    await prisma.message.deleteMany({ where: { conversationId: { in: [convLinked, convLegacy].filter(Boolean) } } }).catch(() => {});
    await prisma.conversation.deleteMany({ where: { id: { in: [convLinked, convLegacy].filter(Boolean) } } }).catch(() => {});
    await prisma.profile.deleteMany({ where: { id: { in: createdUserIds } } }).catch(() => {});
  });

  it("delivers conversation rows only to participants", async () => {
    const ownerRows = await restTable("GET", "conversations", `?id=in.(${convLinked},${convLegacy})&select=id`, owner.accessToken);
    expect(ownerRows.status).toBe(200);
    expect(ownerRows.json as unknown[]).toHaveLength(2);

    const contactRows = await restTable("GET", "conversations", `?id=eq.${convLegacy}&select=id`, contact.accessToken);
    expect((contactRows.json as unknown[]).length).toBe(0);

    const outsiderRows = await restTable("GET", "conversations", `?select=id`, outsider.accessToken);
    expect(outsiderRows.status).toBe(200);
    expect(outsiderRows.json as unknown[]).toHaveLength(0);
  });

  it("delivers messages of a linked conversation to both participants only", async () => {
    for (const u of [owner, contact]) {
      // Kolom fisik Postgres snake_case — PostgREST tidak melalui mapping Prisma.
      const rows = await restTable("GET", "messages", `?conversation_id=eq.${convLinked}&select=id,body&order=created_at.asc`, u.accessToken);
      expect(rows.status).toBe(200);
      const list = rows.json as { body: string }[];
      expect(list.map((m) => m.body)).toEqual(["owner-message-A", "contact-message-A"]);
    }
    const outsiderRows = await restTable("GET", "messages", `?conversation_id=eq.${convLinked}&select=id,body`, outsider.accessToken);
    expect(outsiderRows.json as unknown[]).toHaveLength(0);
  });

  it("keeps legacy contact_id = NULL (Telegram) history owner-only", async () => {
    const ownerRows = await restTable("GET", "messages", `?conversation_id=eq.${convLegacy}&select=id,body`, owner.accessToken);
    expect((ownerRows.json as { body: string }[]).map((m) => m.body)).toEqual(["legacy-telegram-message"]);

    const contactRows = await restTable("GET", "messages", `?conversation_id=eq.${convLegacy}&select=id`, contact.accessToken);
    expect(contactRows.json as unknown[]).toHaveLength(0);
  });

  it("denies client INSERT/UPDATE/DELETE with real client credentials", async () => {
    const insert = await restTable("POST", "messages", "", owner.accessToken, {
      conversation_id: convLinked,
      body: "rls-insert-probe",
      senderRole: "OWNER",
      channel: "IN_APP",
    });
    expect(insert.status).toBeGreaterThanOrEqual(400);
    expect(insert.status).not.toBe(201);

    const probe = await restTable("GET", "messages", `?body=eq.${encodeURIComponent("rls-insert-probe")}`, owner.accessToken);
    expect((probe.json as unknown[]).length).toBe(0);

    const messageIdRow = (await restTable("GET", "messages", `?conversation_id=eq.${convLinked}&select=id&limit=1`, owner.accessToken))
      .json as { id: string }[];
    const messageId = messageIdRow[0]?.id;

    const update = await restTable("PATCH", "messages", `?id=eq.${messageId}`, owner.accessToken, { body: "hacked" });
    expect(update.status).toBeGreaterThanOrEqual(400);
    expect(update.status).not.toBe(200);
    expect(update.status).not.toBe(204);

    const del = await restTable("DELETE", "messages", `?id=eq.${messageId}`, owner.accessToken);
    expect(del.status).toBeGreaterThanOrEqual(400);

    const untouched = await restTable("GET", "messages", `?id=eq.${messageId}&select=body`, owner.accessToken);
    expect((untouched.json as { body: string }[])[0]?.body).toBe("owner-message-A");
  });

  it("has the messages table registered in the supabase_realtime publication", async () => {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'`;
    expect(Number(rows[0]?.count ?? 0)).toBeGreaterThanOrEqual(1);
  });
});
