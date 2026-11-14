import type { Property } from "./types";

export type RuleIconKey =
  | "key"
  | "clock"
  | "moon"
  | "users"
  | "heart"
  | "door-closed"
  | "door-open"
  | "cigarette"
  | "paw"
  | "ban"
  | "volume-x"
  | "sparkles"
  | "id-card"
  | "credit-card"
  | "file-text"
  | "check"
  | "info";

export type RuleItem = {
  text: string;
  type: "allowed" | "prohibited" | "neutral";
  iconKey: RuleIconKey;
};

export type RuleCategoryKey = "occupancy" | "access" | "guest" | "conduct" | "documents";

export interface RuleCategory {
  key: RuleCategoryKey;
  titleId: string;
  titleEn: string;
  items: RuleItem[];
}

export function resolveRuleIconKey(
  text: string,
  type?: "allowed" | "prohibited" | "neutral"
): RuleIconKey {
  const lower = text.toLowerCase();

  // 1. Conduct & Prohibitions
  if (lower.includes("rokok") || lower.includes("merokok") || lower.includes("smoking")) {
    return "cigarette";
  }
  if (lower.includes("hewan") || lower.includes("kucing") || lower.includes("anjing") || lower.includes("peliharaan") || lower.includes("pet")) {
    return "paw";
  }
  if (lower.includes("miras") || lower.includes("narkoba") || lower.includes("alkohol") || lower.includes("zat terlarang")) {
    return "ban";
  }
  if (lower.includes("tenang") || lower.includes("ketenangan") || lower.includes("bising") || lower.includes("gaduh")) {
    return "volume-x";
  }
  if (lower.includes("bersih") || lower.includes("kebersihan") || lower.includes("sampah")) {
    return "sparkles";
  }

  // 2. Access Keys & Curfew
  if (lower.includes("bebas jam malam")) {
    return "key";
  }
  if (
    lower.includes("jam malam") ||
    lower.includes("ditutup") ||
    lower.includes("larut malam")
  ) {
    return "moon";
  }
  if (
    lower.includes("24 jam") ||
    lower.includes("kunci") ||
    lower.includes("gerbang") ||
    lower.includes("akses")
  ) {
    return "key";
  }

  // 3. Occupancy & Married Couples
  if (lower.includes("pasutri") || lower.includes("surat nikah") || lower.includes("buku nikah")) {
    return "heart";
  }
  if (
    lower.includes("putri") ||
    lower.includes("wanita") ||
    lower.includes("putra") ||
    lower.includes("pria") ||
    lower.includes("campur") ||
    lower.includes("orang per kamar") ||
    lower.includes("kapasitas") ||
    lower.includes("penghuni") ||
    lower.includes("anak")
  ) {
    return "users";
  }

  // 4. Guest & Visiting
  if (lower.includes("lawan jenis") || (lower.includes("tamu") && lower.includes("kamar"))) {
    return "door-closed";
  }
  if (lower.includes("tamu") || lower.includes("kunjungan") || lower.includes("ruang tamu")) {
    return "door-open";
  }

  // 5. Documents & Payments
  if (lower.includes("ktp") || lower.includes("kartu keluarga") || lower.includes("kk") || lower.includes("identitas")) {
    return "id-card";
  }
  if (lower.includes("deposit") || lower.includes("dp") || lower.includes("uang sewa") || lower.includes("pelunasan") || lower.includes("bayar")) {
    return "credit-card";
  }
  if (lower.includes("booking") || lower.includes("dokumen") || lower.includes("surat")) {
    return "file-text";
  }

  if (type === "prohibited") return "ban";
  if (type === "allowed") return "check";
  return "info";
}

export function parsePropertyRules(property: Property): {
  cleanDescription: string;
  rules: string[];
  patokan?: string;
  highlights: { label: string; tone: "green" | "blue" | "amber" | "neutral" }[];
  categories: RuleCategory[];
} {
  const desc = property.description || "";
  let cleanDescription = desc;
  let parsedRules: string[] = [];
  let patokan: string | undefined;

  const patokanMatch = desc.match(/Patokan:\s*([^\n]+)/i);
  if (patokanMatch) {
    patokan = patokanMatch[1].trim();
  }

  const rulesMatch = desc.match(
    /(?:Aturan & Ketentuan Kos|Peraturan Kos|Persyaratan Sewa|Aturan Kos):\s*([\s\S]+)/i
  );
  if (rulesMatch) {
    const rawRules = rulesMatch[1];
    parsedRules = rawRules
      .split(/\r?\n/)
      .map((line) => line.replace(/^[\s•\-\*]+/, "").trim())
      .filter((line) => line.length > 0 && !line.toLowerCase().startsWith("patokan:"));

    cleanDescription = desc
      .replace(/(?:Aturan & Ketentuan Kos|Peraturan Kos|Persyaratan Sewa|Aturan Kos):\s*([\s\S]+)/i, "")
      .replace(/Patokan:\s*[^\n]+/i, "")
      .trim();
  } else {
    cleanDescription = desc.replace(/Patokan:\s*[^\n]+/i, "").trim();
  }

  const has24h = property.facilities?.some(
    (f) => f === "access-24h" || (typeof f === "object" && (f as any)?.key === "access-24h")
  );

  const catMap: Record<RuleCategoryKey, RuleItem[]> = {
    occupancy: [],
    access: [],
    guest: [],
    conduct: [],
    documents: [],
  };

  const classify = (text: string): { category: RuleCategoryKey; item: RuleItem } => {
    const lower = text.toLowerCase();
    const isProhibited =
      lower.includes("dilarang") ||
      lower.includes("tidak boleh") ||
      lower.includes("tidak diperkenankan") ||
      lower.includes("no smoking") ||
      lower.includes("jangan");

    const isAllowed =
      lower.includes("bebas") ||
      lower.includes("boleh") ||
      lower.includes("diperbolehkan") ||
      lower.includes("tersedia") ||
      lower.includes("24 jam") ||
      lower.includes("khusus");

    const type: RuleItem["type"] = isProhibited ? "prohibited" : isAllowed ? "allowed" : "neutral";
    const iconKey = resolveRuleIconKey(text, type);

    if (
      lower.includes("tamu") ||
      lower.includes("kunjungan") ||
      lower.includes("lawan jenis") ||
      lower.includes("menginap")
    ) {
      return { category: "guest", item: { text, type, iconKey } };
    }

    if (
      lower.includes("jam malam") ||
      lower.includes("24 jam") ||
      lower.includes("gerbang") ||
      lower.includes("kunci")
    ) {
      return { category: "access", item: { text, type, iconKey } };
    }

    if (
      lower.includes("ktp") ||
      lower.includes("buku nikah") ||
      lower.includes("kartu keluarga") ||
      lower.includes("kk") ||
      lower.includes("identitas") ||
      lower.includes("dokumen") ||
      lower.includes("deposit") ||
      lower.includes("dp") ||
      lower.includes("pelunasan")
    ) {
      return { category: "documents", item: { text, type, iconKey } };
    }

    if (
      lower.includes("putri") ||
      lower.includes("putra") ||
      lower.includes("campur") ||
      lower.includes("pasutri") ||
      lower.includes("kapasitas") ||
      lower.includes("orang per kamar") ||
      lower.includes("penghuni") ||
      lower.includes("kriteria") ||
      lower.includes("anak")
    ) {
      return { category: "occupancy", item: { text, type, iconKey } };
    }

    return { category: "conduct", item: { text, type, iconKey } };
  };

  for (const rule of parsedRules) {
    const { category, item } = classify(rule);
    catMap[category].push(item);
  }

  // Populate baseline items if empty
  if (catMap.occupancy.length === 0) {
    if (property.gender === "female") {
      catMap.occupancy.push({
        text: "Khusus Penghuni Putri (Wanita)",
        type: "allowed",
        iconKey: resolveRuleIconKey("Khusus Penghuni Putri (Wanita)", "allowed"),
      });
      catMap.occupancy.push({
        text: "Maksimal 1 penghuni per kamar (biaya tambahan bila 2 orang)",
        type: "neutral",
        iconKey: resolveRuleIconKey("Maksimal 1 penghuni per kamar", "neutral"),
      });
      catMap.occupancy.push({
        text: "Tidak diperkenankan untuk pasutri",
        type: "prohibited",
        iconKey: resolveRuleIconKey("Tidak diperkenankan untuk pasutri", "prohibited"),
      });
    } else if (property.gender === "male") {
      catMap.occupancy.push({
        text: "Khusus Penghuni Putra (Pria)",
        type: "allowed",
        iconKey: resolveRuleIconKey("Khusus Penghuni Putra (Pria)", "allowed"),
      });
      catMap.occupancy.push({
        text: "Maksimal 1 penghuni per kamar",
        type: "neutral",
        iconKey: resolveRuleIconKey("Maksimal 1 penghuni per kamar", "neutral"),
      });
      catMap.occupancy.push({
        text: "Tidak diperkenankan untuk pasutri",
        type: "prohibited",
        iconKey: resolveRuleIconKey("Tidak diperkenankan untuk pasutri", "prohibited"),
      });
    } else {
      catMap.occupancy.push({
        text: "Tipe Kos Campur (Putra & Putri di kamar/lantai terpisah)",
        type: "allowed",
        iconKey: resolveRuleIconKey("Tipe Kos Campur", "allowed"),
      });
      catMap.occupancy.push({
        text: "Pasutri diperbolehkan dengan membawa fotokopi Surat Nikah",
        type: "allowed",
        iconKey: resolveRuleIconKey("Pasutri diperbolehkan dengan membawa fotokopi Surat Nikah", "allowed"),
      });
      catMap.occupancy.push({
        text: "Maksimal 2 orang per kamar",
        type: "neutral",
        iconKey: resolveRuleIconKey("Maksimal 2 orang per kamar", "neutral"),
      });
    }
  }

  if (catMap.access.length === 0) {
    if (has24h) {
      catMap.access.push({
        text: "Akses gerbang 24 Jam (bebas jam malam)",
        type: "allowed",
        iconKey: resolveRuleIconKey("Akses gerbang 24 Jam (bebas jam malam)", "allowed"),
      });
      catMap.access.push({
        text: "Setiap penghuni diberikan kunci akses mandiri",
        type: "allowed",
        iconKey: resolveRuleIconKey("Setiap penghuni diberikan kunci akses mandiri", "allowed"),
      });
    } else {
      catMap.access.push({
        text: "Akses gerbang ditutup pukul 23:00 WIB",
        type: "neutral",
        iconKey: resolveRuleIconKey("Akses gerbang ditutup pukul 23:00 WIB", "neutral"),
      });
      catMap.access.push({
        text: "Kepulangan larut malam wajib konfirmasi ke pengelola kos",
        type: "neutral",
        iconKey: resolveRuleIconKey("Kepulangan larut malam wajib konfirmasi ke pengelola kos", "neutral"),
      });
    }
    catMap.access.push({
      text: "Wajib menutup dan mengunci kembali gerbang demi keamanan bersama",
      type: "neutral",
      iconKey: resolveRuleIconKey("Wajib menutup dan mengunci kembali gerbang", "neutral"),
    });
  }

  if (catMap.guest.length === 0) {
    catMap.guest.push({
      text: "Tamu lawan jenis dilarang masuk ke dalam kamar penghuni",
      type: "prohibited",
      iconKey: resolveRuleIconKey("Tamu lawan jenis dilarang masuk ke dalam kamar penghuni", "prohibited"),
    });
    catMap.guest.push({
      text: "Tamu boleh berkunjung di area ruang tamu bersama hingga pukul 21:00 WIB",
      type: "allowed",
      iconKey: resolveRuleIconKey("Tamu boleh berkunjung di area ruang tamu bersama", "allowed"),
    });
    catMap.guest.push({
      text: "Tamu yang menginap wajib melapor pengelola kos sebelumnya",
      type: "neutral",
      iconKey: resolveRuleIconKey("Tamu yang menginap wajib melapor pengelola kos sebelumnya", "neutral"),
    });
  }

  if (catMap.conduct.length === 0) {
    catMap.conduct.push({
      text: "Dilarang merokok di dalam kamar ber-AC atau lorong tertutup",
      type: "prohibited",
      iconKey: resolveRuleIconKey("Dilarang merokok di dalam kamar ber-AC", "prohibited"),
    });
    catMap.conduct.push({
      text: "Dilarang membawa hewan peliharaan",
      type: "prohibited",
      iconKey: resolveRuleIconKey("Dilarang membawa hewan peliharaan", "prohibited"),
    });
    catMap.conduct.push({
      text: "Dilarang membawa miras, narkoba, atau zat terlarang",
      type: "prohibited",
      iconKey: resolveRuleIconKey("Dilarang membawa miras, narkoba, atau zat terlarang", "prohibited"),
    });
    catMap.conduct.push({
      text: "Menjaga ketenangan dan kenyamanan bersama setelah pukul 22:00 WIB",
      type: "allowed",
      iconKey: resolveRuleIconKey("Menjaga ketenangan dan kenyamanan bersama", "allowed"),
    });
    catMap.conduct.push({
      text: "Menjaga kebersihan area bersama setelah selesai digunakan",
      type: "allowed",
      iconKey: resolveRuleIconKey("Menjaga kebersihan area bersama", "allowed"),
    });
  }

  if (catMap.documents.length === 0) {
    catMap.documents.push({
      text: "Wajib menyertakan foto KTP asli yang masih berlaku saat check-in",
      type: "allowed",
      iconKey: resolveRuleIconKey("Wajib menyertakan foto KTP asli", "allowed"),
    });
    catMap.documents.push({
      text: "Booking kamar wajib disertai deposit (DP) sesuai ketentuan",
      type: "neutral",
      iconKey: resolveRuleIconKey("Booking kamar wajib disertai deposit (DP)", "neutral"),
    });
    catMap.documents.push({
      text: "Pelunasan sisa uang sewa dilakukan sebelum serah terima kunci",
      type: "neutral",
      iconKey: resolveRuleIconKey("Pelunasan sisa uang sewa", "neutral"),
    });
  }

  const highlights: { label: string; tone: "green" | "blue" | "amber" | "neutral" }[] = [];
  if (property.gender === "female") {
    highlights.push({ label: "Khusus Putri", tone: "blue" });
  } else if (property.gender === "male") {
    highlights.push({ label: "Khusus Putra", tone: "blue" });
  } else {
    highlights.push({ label: "Campur (Putra/Putri)", tone: "neutral" });
  }

  if (has24h || catMap.access.some((i) => i.text.toLowerCase().includes("24 jam"))) {
    highlights.push({ label: "Akses 24 Jam", tone: "green" });
  } else {
    highlights.push({ label: "Jam Malam Berlaku", tone: "amber" });
  }

  highlights.push({ label: "Wajib KTP", tone: "neutral" });

  const allRulesText = [
    ...catMap.occupancy,
    ...catMap.access,
    ...catMap.guest,
    ...catMap.conduct,
    ...catMap.documents,
  ].map((i) => i.text.toLowerCase());

  if (allRulesText.some((t) => t.includes("pasutri") && !t.includes("tidak"))) {
    highlights.push({ label: "Boleh Pasutri (Buku Nikah)", tone: "green" });
  } else {
    highlights.push({ label: "Tanpa Pasutri", tone: "neutral" });
  }

  if (allRulesText.some((t) => t.includes("boleh bawa hewan") || (t.includes("hewan") && !t.includes("dilarang")))) {
    highlights.push({ label: "Boleh Bawa Hewan", tone: "neutral" });
  }

  const categories: RuleCategory[] = [
    {
      key: "occupancy",
      titleId: "Tipe & Kapasitas Penghuni",
      titleEn: "Occupancy & Tenant Type",
      items: catMap.occupancy,
    },
    {
      key: "access",
      titleId: "Akses & Jam Malam",
      titleEn: "Access & Curfew",
      items: catMap.access,
    },
    {
      key: "guest",
      titleId: "Ketentuan Tamu & Kunjungan",
      titleEn: "Guest Policy",
      items: catMap.guest,
    },
    {
      key: "conduct",
      titleId: "Peraturan Bersama & Ketertiban",
      titleEn: "Conduct & Prohibitions",
      items: catMap.conduct,
    },
    {
      key: "documents",
      titleId: "Ketentuan Dokumen & Pembayaran",
      titleEn: "Documents & Requirements",
      items: catMap.documents,
    },
  ];

  const flatRules = categories.flatMap((c) => c.items.map((i) => i.text));

  return {
    cleanDescription: cleanDescription || desc,
    rules: flatRules,
    patokan,
    highlights,
    categories,
  };
}
