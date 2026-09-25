import "server-only";
import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getDatasourceUrl(): string {
  const url = new URL(env.DATABASE_URL);
  if (!url.searchParams.has("connect_timeout")) url.searchParams.set("connect_timeout", "5");
  if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "5");
  if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "3");
  return url.toString();
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: getDatasourceUrl(),
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
