import { describe, it, expect } from "vitest";
import { DETAIL_NAV_ITEMS } from "./PropertyDetailSubNav";

describe("PropertyDetailSubNav", () => {
  it("contains all 6 required navigation tabs matching user specification", () => {
    const ids = DETAIL_NAV_ITEMS.map((item) => item.id);
    expect(ids).toEqual([
      "foto-properti",
      "fasilitas-kamar",
      "fasilitas-umum",
      "lokasi",
      "review",
      "pemilik",
    ]);

    const idLabels = DETAIL_NAV_ITEMS.map((item) => item.labelId);
    expect(idLabels).toEqual([
      "Foto Properti",
      "Fasilitas Kamar",
      "Fasilitas Umum",
      "Lokasi",
      "Review",
      "Pemilik Kos",
    ]);
  });
});
