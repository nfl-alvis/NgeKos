import { describe, it, expect } from "vitest";
import {
  DETAIL_NAV_ITEMS,
  determineActiveSection,
  SectionPosition,
} from "./PropertyDetailSubNav";

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

  describe("determineActiveSection", () => {
    const mockSections: SectionPosition[] = [
      { id: "foto-properti", top: 100 },
      { id: "fasilitas-kamar", top: 600 },
      { id: "fasilitas-umum", top: 1200 },
      { id: "lokasi", top: 1800 },
      { id: "review", top: 2400 },
      { id: "pemilik", top: 3000 },
    ];

    it("returns empty string if sectionPositions is empty", () => {
      const active = determineActiveSection({
        scrollPos: 500,
        viewportHeight: 800,
        documentHeight: 4000,
        sectionPositions: [],
      });
      expect(active).toBe("");
    });

    it("returns first section at top of page", () => {
      const active = determineActiveSection({
        scrollPos: 200,
        viewportHeight: 800,
        documentHeight: 4000,
        sectionPositions: mockSections,
      });
      expect(active).toBe("foto-properti");
    });

    it("correctly identifies 'lokasi' when scroll position passes its offset", () => {
      // lokasi top is 1800, offset 135 -> threshold is 1665
      const active = determineActiveSection({
        scrollPos: 1700,
        viewportHeight: 800,
        documentHeight: 4000,
        sectionPositions: mockSections,
        headerOffset: 135,
      });
      expect(active).toBe("lokasi");
    });

    it("identifies earlier section when before threshold", () => {
      // scrollPos 1600 is below lokasi threshold (1665), so remains fasilitas-umum
      const active = determineActiveSection({
        scrollPos: 1600,
        viewportHeight: 800,
        documentHeight: 4000,
        sectionPositions: mockSections,
        headerOffset: 135,
      });
      expect(active).toBe("fasilitas-umum");
    });

    it("activates the last section when user reaches bottom of the page", () => {
      // documentHeight = 3200, viewport = 800, scrollPos = 2380 (near bottom)
      // Even if scrollPos hasn't reached pemilik top (3000 - 135 = 2865)
      const active = determineActiveSection({
        scrollPos: 2380,
        viewportHeight: 800,
        documentHeight: 3200,
        sectionPositions: mockSections,
      });
      expect(active).toBe("pemilik");
    });
  });
});
