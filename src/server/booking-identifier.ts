import type { Prisma } from "@prisma/client";
import { z } from "zod";

export function bookingIdentifierWhere(identifier: string): Prisma.BookingWhereInput {
  return z.uuid().safeParse(identifier).success
    ? { OR: [{ id: identifier }, { code: identifier }] }
    : { code: identifier };
}
