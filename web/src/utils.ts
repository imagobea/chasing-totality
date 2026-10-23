// How the UI writes dates, countdowns and positions on the map

export type Coordinates = { lng: number; lat: number };

const MS_PER_DAY = 86_400_000;
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// 25.69 → "25.69° N", -6.5 → "6.50° S": hemisphere letters instead of signs
function formatDegrees(value: number, positive: string, negative: string): string {
  return `${Math.abs(value).toFixed(2)}° ${value < 0 ? negative : positive}`;
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

// { lng: 32.64, lat: 25.69 } → "25.69° N · 32.64° E", latitude first
export function formatCoordinates({ lng, lat }: Coordinates): string {
  return `${formatDegrees(lat, "N", "S")} · ${formatDegrees(lng, "E", "W")}`;
}
