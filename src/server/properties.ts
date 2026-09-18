import { z } from "zod";

const genderMap = { mixed: "MIXED", male: "MALE", female: "FEMALE" } as const;

export const propertyListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().trim().max(120).optional(),
    city: z.string().trim().max(100).optional(),
    maxPrice: z.coerce.number().int().min(0).max(100_000_000_000).optional(),
    facilities: z.array(z.string().trim().min(1).max(64)).max(20).default([]),
    gender: z.preprocess(
      (value) => (typeof value === "string" ? genderMap[value.toLowerCase() as keyof typeof genderMap] ?? value.toUpperCase() : value),
      z.enum(["MIXED", "MALE", "FEMALE"]).optional(),
    ),
    sort: z.enum(["rating", "price-asc", "price-desc", "newest"]).default("rating"),
  })
  .strict();

export function propertyIdentifierWhere(identifier: string): { id: string } | { slug: string } {
  return z.uuid().safeParse(identifier).success ? { id: identifier } : { slug: identifier };
}

export function slugifyPropertyName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
