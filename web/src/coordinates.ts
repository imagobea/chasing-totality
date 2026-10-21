// How the UI writes a position on the map

export type Coordinates = { lng: number; lat: number };

// 25.69 → "25.69° N", -6.5 → "6.50° S": hemisphere letters instead of signs
function formatDegrees(value: number, positive: string, negative: string): string {
  return `${Math.abs(value).toFixed(2)}° ${value < 0 ? negative : positive}`;
}

// { lng: 32.64, lat: 25.69 } → "25.69° N · 32.64° E", latitude first
export function formatCoordinates({ lng, lat }: Coordinates): string {
  return `${formatDegrees(lat, "N", "S")} · ${formatDegrees(lng, "E", "W")}`;
}
