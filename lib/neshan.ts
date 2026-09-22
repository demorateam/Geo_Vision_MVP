/**
 * Reverse geocoding via Neshan API.
 * Converts lat/lng to a human-readable address string.
 * Returns null on any failure (missing key, network error, bad response)
 * so callers can safely fall back to showing raw coordinates.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const apiKey = process.env.NESHAN_API_KEY;

  if (!apiKey) {
    console.error("NESHAN_API_KEY is not set — skipping reverse geocoding");
    return null;
  }

  try {
    const url = `https://api.neshan.org/v5/reverse?lat=${latitude}&lng=${longitude}`;
    const response = await fetch(url, {
      headers: { "Api-Key": apiKey },
      // Reverse geocoding is a one-time lookup at creation time; no need to cache.
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        `Neshan reverse geocoding failed with status ${response.status}`,
      );
      return null;
    }

    const data = await response.json();

    if (typeof data?.formatted_address !== "string" || !data.formatted_address) {
      console.error("Neshan reverse geocoding returned no formatted_address");
      return null;
    }

    return data.formatted_address as string;
  } catch (error) {
    console.error("Neshan reverse geocoding error:", error);
    return null;
  }
}