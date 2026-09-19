import { NextResponse } from "next/server";

// Proxy for Geoapify Autocomplete - keeps the API key server-side.
// Client calls /api/geocode?text=...&type=... ; we forward to Geoapify
// and return a slimmed-down list so no token bloat or key leakage.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = (searchParams.get("text") || "").trim();
  const type = (searchParams.get("type") || "").trim();

  if (!text) return NextResponse.json({ features: [] });
  if (text.length < 2) return NextResponse.json({ features: [] });

  const key = process.env.GEOAPIFY_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "GEOAPIFY_API_KEY is not set" },
      { status: 500 }
    );
  }

  const url = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
  url.searchParams.set("text", text);
  url.searchParams.set("apiKey", key);
  url.searchParams.set("limit", "6");
  // bias towards Indonesia (kost platform)
  url.searchParams.set("bias", "countrycode:id");
  if (type) url.searchParams.set("type", type);
  url.searchParams.set("lang", "id");

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!res.ok) {
      return NextResponse.json({ error: `Geoapify ${res.status}` }, { status: res.status });
    }
    const data = (await res.json()) as {
      features?: {
        properties?: {
          name?: string;
          formatted?: string;
          address_line1?: string;
          address_line2?: string;
          city?: string;
          county?: string;
          state?: string;
          country?: string;
          result_type?: string;
          category?: string;
        };
        geometry?: { coordinates?: number[] };
      }[];
    };
    const features = (data.features ?? []).map((f) => {
      const p = f.properties ?? {};
      const [lon, lat] = f.geometry?.coordinates ?? [];
      return {
        name: p.name || p.address_line1 || "",
        formatted: p.formatted || "",
        line1: p.address_line1 || "",
        line2: p.address_line2 || "",
        city: p.city || p.county || "",
        state: p.state || "",
        country: p.country || "",
        resultType: p.result_type || "",
        category: p.category || "",
        lon,
        lat,
      };
    });
    return NextResponse.json({ features });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
