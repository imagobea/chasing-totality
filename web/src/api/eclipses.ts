// The eclipse endpoints

// Dates of the eclipses that have data, as YYYY-MM-DD, earliest first
export async function fetchEclipseDates(): Promise<string[]> {
  const response = await fetch("/api/eclipses");
  if (!response.ok) throw new Error(`GET /api/eclipses answered ${response.status}`);
  return (await response.json()) as string[];
}

// One eclipse's isolines as GeoJSON, fetched by MapLibre itself
export function isolinesUrl(date: string): string {
  return `/api/eclipses/${date}/isolines`;
}
