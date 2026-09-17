import { describe, expect, it } from "vitest";
import { propertyListQuerySchema, slugifyPropertyName } from "./properties";

describe("property query parsing", () => {
  it("parses repeated facilities and listing filters", () => {
    const params = new URLSearchParams("kota=Bandung&max=1500000&fas=wifi&fas=parking&gender=female&sort=price-asc");
    const parsed = propertyListQuerySchema.parse({
      city: params.get("kota") ?? undefined,
      maxPrice: params.get("max") ?? undefined,
      facilities: params.getAll("fas"),
      gender: params.get("gender") ?? undefined,
      sort: params.get("sort") ?? undefined,
    });
    expect(parsed).toMatchObject({
      city: "Bandung",
      maxPrice: 1_500_000,
      facilities: ["wifi", "parking"],
      gender: "FEMALE",
      sort: "price-asc",
    });
  });

  it("rejects invalid prices and unknown sort values", () => {
    expect(propertyListQuerySchema.safeParse({ maxPrice: "-1" }).success).toBe(false);
    expect(propertyListQuerySchema.safeParse({ sort: "newest-first" }).success).toBe(false);
  });
});

describe("property slugs", () => {
  it("normalizes Indonesian names into URL-safe slugs", () => {
    expect(slugifyPropertyName("  Kost Putri Mawar — Dago! ")).toBe("kost-putri-mawar-dago");
  });
});
