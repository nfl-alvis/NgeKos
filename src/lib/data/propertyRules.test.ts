import { describe, it, expect } from "vitest";
import { resolveRuleIconKey, parsePropertyRules } from "./propertyRules";
import type { Property } from "./types";

describe("propertyRules", () => {
  it("resolves contextual icon keys accurately based on text content", () => {
    expect(resolveRuleIconKey("Akses gerbang 24 Jam (bebas jam malam)")).toBe("key");
    expect(resolveRuleIconKey("Setiap penghuni diberikan kunci akses mandiri")).toBe("key");
    expect(resolveRuleIconKey("Akses gerbang ditutup pukul 23:00 WIB")).toBe("moon");
    expect(resolveRuleIconKey("Pasutri diperbolehkan dengan membawa fotokopi Surat Nikah")).toBe("heart");
    expect(resolveRuleIconKey("Khusus Penghuni Putri (Wanita)")).toBe("users");
    expect(resolveRuleIconKey("Tamu lawan jenis dilarang masuk ke dalam kamar")).toBe("door-closed");
    expect(resolveRuleIconKey("Tamu boleh berkunjung di area ruang tamu bersama")).toBe("door-open");
    expect(resolveRuleIconKey("Dilarang merokok di dalam kamar")).toBe("cigarette");
    expect(resolveRuleIconKey("Dilarang membawa hewan peliharaan")).toBe("paw");
    expect(resolveRuleIconKey("Dilarang membawa miras atau narkoba")).toBe("ban");
    expect(resolveRuleIconKey("Menjaga ketenangan setelah pukul 22:00")).toBe("volume-x");
    expect(resolveRuleIconKey("Wajib menyertakan foto KTP asli")).toBe("id-card");
    expect(resolveRuleIconKey("Booking kamar wajib disertai deposit (DP)")).toBe("credit-card");
  });

  it("parses property rules into independent categories with resolved icon keys", () => {
    const dummyProp: Property = {
      slug: "kost-test",
      name: "Kost Test Eksklusif",
      tagline: "Nyaman di pusat kota",
      description: "Deskripsi kos.\n\nAturan & Ketentuan Kos:\n• Akses 24 Jam bebas jam malam\n• Wajib foto KTP saat check-in\n• Dilarang merokok di kamar",
      city: "Surabaya",
      district: "Gubeng",
      address: "Jl. Test No. 1",
      gender: "mixed",
      verified: true,
      active: true,
      rating: 4.8,
      reviewCount: 12,
      imageSeed: "kost-test",
      facilities: ["wifi", "access-24h"],
      roomTypes: [],
      minPrice: 1500000,
      distanceToCampusM: 500,
      depositInfo: "Tanpa deposit",
      verificationStatus: "verified",
    };

    const parsed = parsePropertyRules(dummyProp);
    expect(parsed.cleanDescription).toBe("Deskripsi kos.");
    expect(parsed.categories).toHaveLength(5);

    const accessCategory = parsed.categories.find((c) => c.key === "access");
    expect(accessCategory).toBeDefined();
    expect(accessCategory?.titleId).toBe("Akses & Jam Malam");
    expect(accessCategory?.items.some((i) => i.iconKey === "key")).toBe(true);

    const docCategory = parsed.categories.find((c) => c.key === "documents");
    expect(docCategory).toBeDefined();
    expect(docCategory?.items.some((i) => i.iconKey === "id-card")).toBe(true);
  });
});
