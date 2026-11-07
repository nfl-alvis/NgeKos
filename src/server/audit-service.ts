import "server-only";
import { isIP } from "node:net";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface AuditActor {
  id?: string | null;
  fullName?: string | null;
  email?: string | null;
  role?: string | null;
}

export interface RecordAuditParams {
  tx?: Prisma.TransactionClient;
  actor?: AuditActor | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  description?: string;
  metadata?: Record<string, unknown> | null;
  request?: Request | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface ListAuditLogsParams {
  page?: number;
  limit?: number;
  search?: string;
  group?: "all" | "verification" | "platform" | "account" | "finance" | "moderation" | "notify" | string;
  action?: string;
  entityType?: string;
  actorId?: string;
  startDate?: string;
  endDate?: string;
}

export interface FormattedAuditLog {
  id: string;
  at: string;
  actor: string;
  actorId: string | null;
  actorEmail: string | null;
  type: string;
  action: string;
  entityType: string;
  entityId: string | null;
  target: string;
  description: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SENSITIVE_KEY_REGEX =
  /(pass(word|wd|phrase)?|secret|token|api_?key|apikey|credential|cookie|auth(orization)?|session(_?id|_?token)?|jwt|bearer|private_?key|card(_?number|_?holder)?|credit_?card|cvv|cvc|pin|ssn)/i;

const SENSITIVE_VALUE_REGEX =
  /^(Bearer\s+[A-Za-z0-9\-._~+/]+=*|ey[A-Za-z0-9-_=]+\.ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]*|[a-zA-Z]+:\/\/[^:]+:([^@]+)@)/i;

export const GROUP_TO_ACTIONS: Record<string, string[]> = {
  verification: ["verify.approve", "verify.reject"],
  platform: [
    "property.disable",
    "property.enable",
    "property.delete",
    "property.update",
    "room.update",
    "room.delete",
    "booking.transition",
  ],
  account: [
    "owner.suspend",
    "owner.reactivate",
    "user.ban",
    "user.unban",
    "admin.role",
    "auth.login",
    "auth.logout",
  ],
  finance: [
    "refund.approve",
    "refund.reject",
    "refund.request",
    "refund.process",
    "refund.cancel",
  ],
  moderation: ["report.resolve", "report.dismiss", "review.hide", "review.show"],
  notify: ["notify.send", "notify.delete"],
};

/**
 * Sanitasi metadata secara rekursif: menutupi kata sandi, token, cookie, dan informasi sensitif,
 * serta mendeteksi circular reference dan kredensial dalam value string.
 */
export function sanitizeAuditMetadata(
  val: unknown,
  depth = 0,
  seen: WeakSet<object> = new WeakSet()
): unknown {
  if (depth > 6) return "[MaxDepth]";
  if (val === null || val === undefined) return val;

  if (typeof val === "string") {
    if (val.length > 1000) return val.slice(0, 1000) + "... [Truncated]";
    if (SENSITIVE_VALUE_REGEX.test(val)) return "[REDACTED_CREDENTIAL]";
    return val;
  }

  if (typeof val !== "object") return val;

  if (seen.has(val)) return "[Circular]";
  seen.add(val);

  if (Array.isArray(val)) {
    return val.map((item) => sanitizeAuditMetadata(item, depth + 1, seen));
  }

  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
    if (SENSITIVE_KEY_REGEX.test(k)) {
      result[k] = "[REDACTED]";
    } else {
      result[k] = sanitizeAuditMetadata(v, depth + 1, seen);
    }
  }
  return result;
}

/**
 * Ekstraksi IP klien yang valid untuk kolom PostgreSQL inet.
 * Memeriksa explicit IP, Cloudflare header, standard reverse proxy, dan forwarded hops.
 */
export function extractClientIp(request?: Request | null, explicitIp?: string | null): string | null {
  if (explicitIp && isIP(explicitIp.trim())) return explicitIp.trim();
  if (!request) return null;

  // 1. Cloudflare connecting IP
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp && isIP(cfIp)) return cfIp;

  // 2. Standard single reverse proxy header
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp && isIP(realIp)) return realIp;

  // 3. Multi-hop forwarded header: ambil IP valid pertama dari klien asal
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",");
    for (const part of parts) {
      const trimmed = part.trim();
      if (isIP(trimmed)) return trimmed;
    }
  }

  return null;
}

/**
 * Ekstraksi User Agent dari Request (dibatasi 500 karakter).
 */
export function extractUserAgent(request?: Request | null, explicitUa?: string | null): string | null {
  if (explicitUa) return explicitUa.slice(0, 500);
  if (!request) return null;
  return request.headers.get("user-agent")?.slice(0, 500) ?? null;
}

/**
 * Mencatat satu entri audit log ke database secara persisten.
 * Mendukung Prisma transaction client (params.tx) untuk integritas atomik operasi kritis.
 */
export async function recordAuditLog(params: RecordAuditParams) {
  const db = params.tx ?? prisma;
  if (!db?.auditLog?.create) {
    return null;
  }
  try {
    const {
      actor,
      action,
      entityType,
      entityId,
      description,
      metadata,
      request,
      ipAddress,
      userAgent,
    } = params;

    let validActorId: string | null = null;
    if (actor?.id && UUID_REGEX.test(actor.id)) {
      // Pastikan profile dengan ID ini benar-benar ada di tabel profiles untuk memenuhi FK
      const exists = await db.profile.findUnique({
        where: { id: actor.id },
        select: { id: true },
      });
      if (exists) {
        validActorId = exists.id;
      }
    }

    const clientIp = extractClientIp(request, ipAddress);
    const ua = extractUserAgent(request, userAgent);

    const mergedMetadata: Record<string, unknown> = {
      ...(metadata ? (sanitizeAuditMetadata(metadata) as Record<string, unknown>) : {}),
    };

    if (actor) {
      mergedMetadata.actor = {
        id: actor.id ?? null,
        fullName: actor.fullName ?? null,
        email: actor.email ?? null,
        role: actor.role ?? null,
      };
    }

    if (description) {
      mergedMetadata.description = description;
    }

    // Tambahkan target jika belum ada
    if (!mergedMetadata.target) {
      mergedMetadata.target = entityId ? `${entityType}:${entityId}` : entityType;
    }

    const created = await db.auditLog.create({
      data: {
        actorId: validActorId,
        action,
        entityType,
        entityId: entityId ?? null,
        metadata: mergedMetadata as Prisma.InputJsonValue,
        ipAddress: clientIp,
        userAgent: ua,
      },
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return created;
  } catch (err) {
    console.error("[AuditService] Failed to record audit log:", err);
    if (params.tx) {
      // Dalam konteks transaksi, re-throw agar transaksi di-rollback secara atomik
      throw err;
    }
    return null;
  }
}

/**
 * Mengambil daftar audit log dari database dengan filter dan pagination server-side.
 */
export async function listAuditLogs(params: ListAuditLogsParams = {}) {
  if (!prisma?.auditLog) {
    return {
      items: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 1 },
    };
  }

  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(500, Math.max(1, Number(params.limit) || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {};

  // Filter Group
  if (params.group && params.group !== "all") {
    const actionsInGroup = GROUP_TO_ACTIONS[params.group];
    if (actionsInGroup && actionsInGroup.length > 0) {
      where.action = { in: actionsInGroup };
    }
  }

  // Filter Action spesifik
  if (params.action && params.action !== "all") {
    where.action = params.action;
  }

  // Filter Entity Type
  if (params.entityType && params.entityType !== "all") {
    where.entityType = params.entityType.toUpperCase();
  }

  // Filter Actor
  if (params.actorId && UUID_REGEX.test(params.actorId)) {
    where.actorId = params.actorId;
  }

  // Filter Rentang Tanggal
  if (params.startDate || params.endDate) {
    where.createdAt = {};
    if (params.startDate) {
      const d = new Date(params.startDate);
      if (!isNaN(d.getTime())) {
        where.createdAt.gte = d;
      }
    }
    if (params.endDate) {
      const d = new Date(params.endDate);
      if (!isNaN(d.getTime())) {
        // Akhir hari (23:59:59.999) jika hanya berupa YYYY-MM-DD
        if (params.endDate.length <= 10) {
          d.setHours(23, 59, 59, 999);
        }
        where.createdAt.lte = d;
      }
    }
  }

  // Pencarian Teks
  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    where.OR = [
      { action: { contains: q, mode: "insensitive" } },
      { entityType: { contains: q, mode: "insensitive" } },
      { entityId: { contains: q, mode: "insensitive" } },
      { actor: { fullName: { contains: q, mode: "insensitive" } } },
      { actor: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [total, records] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    }),
  ]);

  const items: FormattedAuditLog[] = records.map((r) => {
    const meta = (r.metadata as Record<string, unknown> | null) || null;
    const actorMeta = (meta?.actor as Record<string, unknown> | null) || null;

    const actorName =
      r.actor?.fullName ||
      (actorMeta?.fullName as string) ||
      r.actor?.email ||
      (actorMeta?.email as string) ||
      "Admin";

    const actorEmail = r.actor?.email || (actorMeta?.email as string) || null;
    const target =
      (meta?.target as string) ||
      (r.entityId ? `${r.entityType} · ${r.entityId}` : r.entityType);
    const description = (meta?.description as string) || "";

    return {
      id: r.id,
      at: r.createdAt.toISOString(),
      actor: actorName,
      actorId: r.actorId,
      actorEmail,
      type: r.action,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      target,
      description,
      metadata: meta,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
    };
  });

  return {
    items,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}
