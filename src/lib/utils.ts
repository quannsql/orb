import * as turf from "@turf/turf";
import type { Feature, Polygon, GeoJsonProperties } from "geojson";

/**
 * Calculates the area of a GeoJSON polygon in km² and hectares.
 */
export function calculateArea(polygon: Feature<Polygon, GeoJsonProperties>): {
  km2: number;
  hectares: number;
} {
  const areaM2 = turf.area(polygon);
  return {
    km2: Math.round((areaM2 / 1_000_000) * 100) / 100,
    hectares: Math.round((areaM2 / 10_000) * 100) / 100,
  };
}

/**
 * Formats coordinates for display (DMS or decimal).
 */
export function formatCoordinate(
  value: number,
  type: "lat" | "lng"
): string {
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = ((minFloat - min) * 60).toFixed(1);
  const dir =
    type === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";

  return `${deg}°${min.toString().padStart(2, "0")}'${sec.toString().padStart(4, "0")}"${dir}`;
}

/**
 * Formats a decimal coordinate to fixed precision.
 */
export function formatDecimal(value: number, precision = 6): string {
  return value.toFixed(precision);
}

/**
 * Generates an ISO date string for N days ago.
 */
export function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

/**
 * Formats an ISO date for display.
 */
export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a number with thousands separator.
 */
export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Generates a random ID for ticker events.
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Clamps a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Converts a date to Sentinel Hub compatible time range.
 * Returns the date and date+1 day as [from, to].
 */
export function dateToTimeRange(date: string): { from: string; to: string } {
  const d = new Date(date);
  const next = new Date(d);
  next.setDate(next.getDate() + 1);
  return {
    from: d.toISOString().split("T")[0],
    to: next.toISOString().split("T")[0],
  };
}
