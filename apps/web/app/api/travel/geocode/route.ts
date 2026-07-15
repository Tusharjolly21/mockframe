import { NextRequest, NextResponse } from "next/server";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

interface PhotonFeature {
  geometry: {
    coordinates: [number, number];
  };
  properties?: {
    osm_type?: string;
    osm_id?: number;
    name?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    osm_value?: string;
  };
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: "Enter at least two characters." },
      { status: 400 }
    );
  }

  // 1. Try Photon (Komoot) API first (fast, keyless, CORS-friendly, very lenient rate limits)
  try {
    const photonUrl = `https://photon.komoot.io/api?q=${encodeURIComponent(query)}&limit=6`;
    const response = await fetch(photonUrl, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 }
    });

    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.features)) {
        const results = data.features.map((feat: PhotonFeature) => {
          const props = feat.properties || {};
          const namePart = props.name || "";
          const cityPart = props.city || props.town || props.village || "";
          const statePart = props.state || "";
          const countryPart = props.country || "";

          // Remove duplicate names if they are already present
          const parts = [namePart];
          if (cityPart && cityPart !== namePart) parts.push(cityPart);
          if (statePart && statePart !== namePart && statePart !== cityPart) parts.push(statePart);
          if (countryPart && countryPart !== namePart) parts.push(countryPart);

          const displayName = parts.filter(Boolean).join(", ");

          return {
            id: `photon-${props.osm_type || "W"}-${props.osm_id || Math.random()}`,
            name: displayName || "Unknown location",
            coordinates: feat.geometry.coordinates, // GeoJSON uses [longitude, latitude]
            type: props.osm_value || "location",
          };
        });

        if (results.length > 0) {
          return NextResponse.json({ results });
        }
      }
    }
  } catch (err: unknown) {
    console.warn(`Photon geocoding failed, falling back to Nominatim:`, err instanceof Error ? err.message : String(err));
  }

  // 2. Fall back to Nominatim mirrors if Photon returns empty results or fails
  const urlsToTry = [
    process.env.GEOCODING_BASE_URL ?? "https://nominatim.openstreetmap.org",
    "https://nominatim.kumi.systems"
  ];

  const userAgent = process.env.APP_USER_AGENT || "MockframeTravelRouteAnimator";
  const contactEmail = process.env.APP_CONTACT_EMAIL || "hello@mockframe.app";

  let lastError: Error | null = null;

  for (const baseUrl of urlsToTry) {
    const url = new URL("/search", baseUrl);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "6");
    url.searchParams.set("addressdetails", "1");

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "User-Agent": `${userAgent} (${contactEmail})`,
        },
        next: {
          revalidate: 86400, // 24 hours caching
        },
      });

      if (response.ok) {
        const data = (await response.json()) as NominatimResult[];
        return NextResponse.json({
          results: data.map((location) => ({
            id: String(location.place_id),
            name: location.display_name,
            coordinates: [Number(location.lon), Number(location.lat)],
            type: location.type,
          })),
        });
      }

      const errText = await response.text().catch(() => "");
      console.warn(`Geocoding attempt on ${baseUrl} failed with status ${response.status}: ${errText}`);
      lastError = new Error(`Geocoding server returned HTTP ${response.status}`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`Geocoding attempt on ${baseUrl} threw error: ${errMsg}`);
      lastError = err instanceof Error ? err : new Error(errMsg);
    }
  }

  return NextResponse.json(
    { error: lastError instanceof Error ? lastError.message : "Geocoding request failed" },
    { status: 502 }
  );
}
