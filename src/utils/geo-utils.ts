/** GeoJSON Polygon geometry (RFC 7946). */
export interface GeoJsonPolygon {
  readonly type: "Polygon";
  readonly coordinates: readonly (readonly number[])[][];
}

/** Type guard: checks if a value is a GeoJSON Polygon. */
export function isGeoJsonPolygon(value: unknown): value is GeoJsonPolygon {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (obj.type !== "Polygon" || !Array.isArray(obj.coordinates)) return false;
  const coords = obj.coordinates as unknown[];
  return coords.length > 0 && Array.isArray(coords[0]);
}

/**
 * Compute centroid of a polygon ring (simple average).
 * Mirrors backend logic in shapefile-parser.ts.
 * Expects GeoJSON order: [longitude, latitude].
 */
export function computePolygonCentroid(
  ring: readonly (readonly number[])[],
): { latitude: number; longitude: number } {
  if (ring.length === 0) return { latitude: 0, longitude: 0 };
  const sumLng = ring.reduce((acc, pt) => acc + pt[0], 0);
  const sumLat = ring.reduce((acc, pt) => acc + pt[1], 0);
  return {
    longitude: sumLng / ring.length,
    latitude: sumLat / ring.length,
  };
}

/**
 * Convert Leaflet LatLng[] from a drawn polygon to a GeoJSON Polygon.
 * Closes the ring per GeoJSON spec if not already closed.
 */
export function latLngsToGeoJsonPolygon(
  latLngs: ReadonlyArray<{ lat: number; lng: number }>,
): GeoJsonPolygon {
  const ring = latLngs.map(({ lng, lat }) => [lng, lat]);
  if (ring.length > 0) {
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push([first[0], first[1]]);
    }
  }
  return { type: "Polygon", coordinates: [ring] };
}
