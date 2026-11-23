// How the UI writes dates, countdowns and positions on the map

export type Coordinates = { lng: number; lat: number };

const MS_PER_DAY = 86_400_000;
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// 25.69 → "25.69° N", -6.5 → "6.50° S": hemisphere letters instead of signs
function formatDegrees(value: number, positive: string, negative: string): string {
  return `${Math.abs(value).toFixed(2)}° ${value < 0 ? negative : positive}`;
}

// Now's local calendar day as a UTC midnight, to compare with an eclipse date, which a
// YYYY-MM-DD string parses as, so time zones and DST can't add or lose a day
function localDayMs(now: Date): number {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

// "2027-08-02" → "02 AUG 2027", the one way the UI writes a date, read from the string so time
// zones can't shift the day
export function formatDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day} ${MONTHS[Number(month) - 1]} ${year}`;
}

// Whole days from now's local calendar day to the eclipse date, 0 once it's here or past
export function daysUntil(date: string, now = new Date()): number {
  return Math.max(0, Math.round((Date.parse(date) - localDayMs(now)) / MS_PER_DAY));
}

// { lng: 32.64, lat: 25.69 } → "25.69° N · 32.64° E", latitude first
export function formatCoordinates({ lng, lat }: Coordinates): string {
  return `${formatDegrees(lat, "N", "S")} · ${formatDegrees(lng, "E", "W")}`;
}

// Whether the eclipse date is before now's local calendar day, so it's still upcoming on the day
export function isPast(date: string, now = new Date()): boolean {
  return Date.parse(date) < localDayMs(now);
}

// Given a list of eclipse dates, return the first one that isn't past, or null if none. Designed
// to be used with the dates of the list returned by GET /eclipses, which is sorted ascending.
export function firstUpcomingEclipse(dates: string[], now = new Date()): string | null {
  return dates.find((date) => !isPast(date, now)) ?? null;
}
