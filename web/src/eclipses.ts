// Eclipse dates from the API, and how the UI writes them

const MS_PER_DAY = 86_400_000;
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

// Whole days from now's local calendar day to the eclipse date, 0 once it's here or past.
// Both days are taken as UTC midnights, so time zones and DST can't add or lose a day
export function daysUntil(date: string, now = new Date()): number {
  const todayMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  // A YYYY-MM-DD string parses as UTC midnight
  const eclipseMs = Date.parse(date);
  return Math.max(0, Math.round((eclipseMs - todayMs) / MS_PER_DAY));
}
