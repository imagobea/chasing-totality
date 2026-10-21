// Eclipse dates from the API, and how the UI writes them

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// Dates of the eclipses that have data, as YYYY-MM-DD, earliest first
export async function fetchEclipseDates(): Promise<string[]> {
  const response = await fetch("/api/eclipses");
  if (!response.ok) throw new Error(`GET /api/eclipses answered ${response.status}`);
  return (await response.json()) as string[];
}

// "2027-08-02" → "2027 · AUG 02", read from the string so time zones can't shift the day
export function formatEclipseDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${year} · ${MONTHS[Number(month) - 1]} ${day}`;
}
