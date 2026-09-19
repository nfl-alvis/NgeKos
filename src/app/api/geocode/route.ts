import { NextResponse } from "next/server";

// Proxy for Geoapify Autocomplete & Reverse Geocoding - keeps the API key server-side.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = (searchParams.get("text") || "").trim();
  const type = (searchParams.get("type") || "").trim();
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  const key = process.env.GEOAPIFY_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "GEOAPIFY_API_KEY is not set" },
      { status: 500 }
    );
  }

  // Reverse Geocode
  if (lat && lon) {
    const url = new URL("https://api.geoapify.com/v1/geocode/reverse");
    url.searchParams.set("lat", lat);
    url.searchParams.set("lon", lon);
    url.searchParams.set("apiKey", key);
    url.searchParams.set("lang", "id");

    try {
      const res = await fetch(url.toString(), { next: { revalidate: 60 } });
      if (!res.ok) {
        return NextResponse.json({ error: `Geoapify reverse ${res.status}` }, { status: res.status });
      }
      const data = await res.json();
      const features = (data.features ?? []).map((f: any) => {
        const p = f.properties ?? {};
        const [fLon, fLat] = f.geometry?.coordinates ?? [parseFloat(lon), parseFloat(lat)];
        return {
          name: p.name || p.street || p.address_line1 || "",
          formatted: p.formatted || "",
          line1: p.address_line1 || "",
          line2: p.address_line2 || "",
          street: p.street || "",
          housenumber: p.housenumber || "",
          village: p.village || p.suburb || p.hamlet || "",
          district: p.district || p.city_district || p.suburb || "",
          city: p.city || p.county || "",
          state: p.state || "",
          postcode: p.postcode || "",
          resultType: p.result_type || "",
          category: p.category || "",
          lon: fLon,
          lat: fLat,
        };
      });
      return NextResponse.json({ features });
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }
  }

  // Autocomplete
  if (!text || text.length < 2) {
    return NextResponse.json({ features: [] });
  }

  const url = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
  url.searchParams.set("text", text);
  url.searchParams.set("apiKey", key);
  url.searchParams.set("limit", "6");
  url.searchParams.set("bias", "countrycode:id");
  if (type) url.searchParams.set("type", type);
  url.searchParams.set("lang", "id");

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 60 } });
    if (!res.ok) {
      return NextResponse.json({ error: `Geoapify ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    const features = (data.features ?? []).map((f: any) => {
      const p = f.properties ?? {};
      const [fLon, fLat] = f.geometry?.coordinates ?? [];
      return {
        name: p.name || p.street || p.address_line1 || "",
        formatted: p.formatted || "",
        line1: p.address_line1 || "",
        line2: p.address_line2 || "",
        street: p.street || "",
        housenumber: p.housenumber || "",
        village: p.village || p.suburb || p.hamlet || "",
        district: p.district || p.city_district || p.suburb || "",
        city: p.city || p.county || "",
        state: p.state || "",
        postcode: p.postcode || "",
        resultType: p.result_type || "",
        category: p.category || "",
        lon: fLon,
        lat: fLat,
      };
    });
    return NextResponse.json({ features });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
