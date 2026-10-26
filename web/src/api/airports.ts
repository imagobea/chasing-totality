// The airports endpoint

// west, south, east and north edges in degrees, as the endpoint's bbox expects
export type Bbox = [west: number, south: number, east: number, north: number];

// The airports inside the bbox as GeoJSON, fetched by MapLibre itself
export function airportsUrl(bbox: Bbox): string {
  return `/api/airports?bbox=${bbox.join(",")}`;
}
