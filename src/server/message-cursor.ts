import type { Prisma } from "@prisma/client";

export const MESSAGE_PAGE_MAX = 50;
export const MESSAGE_PAGE_DEFAULT = 20;

export interface MessageCursor {
  createdAt: Date;
  id: string;
}

const CURSOR_SEPARATOR = "~";
// `toISOString()` selalu menghasilkan format `.mmmZ`, dan id adalah UUID.
const CURSOR_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z~[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Kursor opaque pagination `(createdAt, id)` — format `ISO~uuid`. */
export function encodeMessageCursor(row: { createdAt: Date; id: string }): string {
  return `${row.createdAt.toISOString()}${CURSOR_SEPARATOR}${row.id}`;
}

/** Parse kursor; `null` bila format tidak valid (pemanggil yang memutuskan error-nya). */
export function parseMessageCursor(raw: string): MessageCursor | null {
  if (!CURSOR_PATTERN.test(raw)) return null;
  const separatorIndex = raw.lastIndexOf(CURSOR_SEPARATOR);
  const createdAt = new Date(raw.slice(0, separatorIndex));
  if (Number.isNaN(createdAt.getTime())) return null;
  return { createdAt, id: raw.slice(separatorIndex + CURSOR_SEPARATOR.length) };
}

/**
 * Where-clause untuk halaman SEBELUM kursor pada urutan (createdAt desc, id desc):
 * `createdAt < c ATAU (createdAt = c DAN id < i)` — id menjadi tie-breaker agar
 * pesan dengan timestamp identik tidak terlewat maupun terduplikasi antar halaman.
 */
export function messagePageWhere(cursor: MessageCursor): Prisma.MessageWhereInput {
  return {
    OR: [
      { createdAt: { lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { lt: cursor.id } },
    ],
  };
}
