"use client";

/* ===== store operasi admin - sumber kebenaran tindakan lintas halaman =====
   Pola sama dengan adminReviewStore: external store sessionStorage +
   useSyncExternalStore dengan snapshot derived stabil. Setiap aksi admin
   (nonaktifkan/hapus properti, tangguhkan owner, blokir user, putuskan
   refund, tangani laporan, sembunyikan review, kirim broadcast, role admin)
   ditulis ke sini → status langsung berubah di halamannya DAN tercatat di
   Audit Log. Aksi lama di-overshadow oleh aksi baru pada entri yang sama. */

import { useSyncExternalStore } from "react";
import type { AdminRole, AuditEntry, AuditType, BroadcastItem } from "@/lib/data/adminData";
import {
  adminAccounts,
  auditLogSeed,
  broadcastHistory,
  CURRENT_ADMIN_EMAIL,
} from "@/lib/data/adminData";

const STORAGE_KEY = "ngekos.admin-ops";

export type OpAction =
  | "disable"
  | "delete"
  | "enable"
  | "suspend"
  | "reactivate"
  | "ban"
  | "unban"
  | "refund-approve"
  | "refund-reject"
  | "resolve"
  | "dismiss"
  | "hide"
  | "show"
  | "send"
  | "set-role";

export interface AdminOp {
  id: string;
  /** id/label entri yang dikenai tindakan */
  entity: string;
  action: OpAction;
  /** ISO timestamp */
  at: string;
  actor: string;
  /** konteks tambahan utk audit/broadcast (mis. "Rp1.750.000" atau JSON broadcast) */
  detail?: string;
}

interface PersistedState {
  ops: AdminOp[];
}

/** snapshot server = kosong (opsi hanya dibuat oleh interaksi klien → tanpa hydration mismatch) */
const EMPTY: PersistedState = { ops: [] };

let persisted: PersistedState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      persisted = { ops: Array.isArray(parsed.ops) ? parsed.ops : [] };
    }
  } catch {
    /* data rusak → abaikan, mulai dari kosong */
  }
}

function setState(next: PersistedState) {
  persisted = next;
  loaded = true;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    /* mode privat → tetap in-memory */
  }
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): PersistedState {
  load();
  return persisted;
}

const getServerSnapshot = () => EMPTY;

let opSeq = 0;

/** Nama admin dari email sesi (fallback profil demo Bayu). */
export function adminNameFor(email: string | undefined): string {
  return (
    adminAccounts.find((a) => a.email === (email ?? CURRENT_ADMIN_EMAIL))?.name ??
    "Bayu Pratama"
  );
}

/** Role admin dari email sesi. */
export function adminRoleFor(email: string | undefined): AdminRole {
  return (
    adminAccounts.find((a) => a.email === (email ?? CURRENT_ADMIN_EMAIL))?.role ??
    "super"
  );
}

/** Catat satu operasi admin (menempelkan actor dari sesi aktif). */
export function recordOp(
  entity: string,
  action: OpAction,
  actorEmail: string | undefined,
  detail?: string
) {
  opSeq += 1;
  setState({
    ops: [
      {
        id: `op-${Date.now()}-${opSeq}`,
        entity,
        action,
        at: new Date().toISOString(),
        actor: adminNameFor(actorEmail),
        detail,
      },
      ...persisted.ops,
    ],
  });
}

/** Aksi terbaru pada sebuah entri (opsi sesi mengesampingkan status seed). */
export function latestActionFor(ops: AdminOp[], entity: string): OpAction | undefined {
  return ops.find((o) => o.entity === entity)?.action;
}

/** Reaktif: seluruh operasi admin sesi ini, terbaru di depan. */
export function useAdminOps(): AdminOp[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot).ops;
}

/* ===== turunan status per domain ===== */

/** Status properti efektif: seed "aktif" + disable/delete/enable sesi. */
export function propertyStatus(
  ops: AdminOp[],
  slug: string,
  seedActive: boolean
): "aktif" | "nonaktif" | "dihapus" {
  const last = latestActionFor(ops, slug);
  if (last === "delete") return "dihapus";
  if (last === "disable") return "nonaktif";
  if (last === "enable") return "aktif";
  return seedActive ? "aktif" : "nonaktif";
}

/** Status owner efektif (suspend/reactivate menang atas seed). */
export function ownerStatus(
  ops: AdminOp[],
  id: string,
  seed: "aktif" | "ditangguhkan" | "menunggu"
): "aktif" | "ditangguhkan" | "menunggu" {
  const last = latestActionFor(ops, id);
  if (last === "suspend") return "ditangguhkan";
  if (last === "reactivate") return "aktif";
  return seed;
}

/** Status seeker efektif (ban/unban menang atas seed). */
export function seekerStatus(
  ops: AdminOp[],
  id: string,
  seed: "aktif" | "diblokir"
): "aktif" | "diblokir" {
  const last = latestActionFor(ops, id);
  if (last === "ban") return "diblokir";
  if (last === "unban") return "aktif";
  return seed;
}

/** Role admin efektif dari aksi set-role terbaru, fallback seed. */
export function adminRoleOverride(
  ops: AdminOp[],
  id: string
): AdminRole | undefined {
  return ops.find((o) => o.entity === id && o.action === "set-role")
    ?.detail as AdminRole | undefined;
}

/* ===== audit log = operasi sesi (terbaru di depan) + seed ===== */

const OP_TO_AUDIT: Record<OpAction, AuditType> = {
  disable: "property.disable",
  enable: "property.enable",
  delete: "property.delete",
  suspend: "owner.suspend",
  reactivate: "owner.reactivate",
  ban: "user.ban",
  unban: "user.unban",
  "refund-approve": "refund.approve",
  "refund-reject": "refund.reject",
  resolve: "report.resolve",
  dismiss: "report.dismiss",
  hide: "review.hide",
  show: "review.show",
  send: "notify.send",
  "set-role": "admin.role",
};

/** Riwayat audit lengkap (entri sesi di depan, seed statis di belakang). */
export function useAuditEntries(): AuditEntry[] {
  const ops = useAdminOps();
  const sessionRows: AuditEntry[] = ops
    .filter((o) => o.action !== "send") // broadcast sudah muncul sbg notify.send via detail
    .map((o, idx) => ({
      id: `ad-session-${idx}`,
      at: o.at,
      actor: o.actor,
      type: OP_TO_AUDIT[o.action],
      target: o.detail ? `${o.entity} · ${o.detail}` : o.entity,
    }));
  const sends: AuditEntry[] = ops
    .filter((o) => o.action === "send")
    .map((o, idx) => ({
      id: `ad-send-${idx}`,
      at: o.at,
      actor: o.actor,
      type: "notify.send",
      target: o.entity,
    }));
  return [...sessionRows, ...sends, ...auditLogSeed];
}

/* ===== broadcast = kiriman sesi + riwayat seed ===== */

/** Payload broadcast diserialisasi ke detail: target|judul|isi|penerima. */
export function broadcastDetail(
  target: BroadcastItem["target"],
  title: string,
  body: string,
  recipients: number
): string {
  return JSON.stringify({ target, title, body, recipients });
}

export function useBroadcasts(): BroadcastItem[] {
  const ops = useAdminOps();
  const sent: BroadcastItem[] = ops
    .filter((o) => o.action === "send")
    .flatMap((o): BroadcastItem[] => {
      try {
        const p = JSON.parse(o.detail ?? "") as {
          target: BroadcastItem["target"];
          title: string;
          body: string;
          recipients: number;
        };
        return [{ id: o.id, sentAt: o.at, ...p }];
      } catch {
        return [];
      }
    });
  return [...sent, ...broadcastHistory];
}
