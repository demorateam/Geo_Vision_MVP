"use client";

import exifr from "exifr";

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
}

export async function extractGpsFromImage(file: File): Promise<GpsCoordinates | null> {
  try {
    const gps = await exifr.gps(file);
    if (gps && typeof gps.latitude === "number" && typeof gps.longitude === "number") {
      return { latitude: gps.latitude, longitude: gps.longitude };
    }
    return null;
  } catch {
    return null;
  }
}
