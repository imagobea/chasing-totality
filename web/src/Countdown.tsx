import { daysUntil } from "./eclipses.js";

type CountdownProps = {
  date: string | null;
};

// Worked out on render; it doesn't tick over at midnight
export function Countdown({ date }: CountdownProps) {
  const days = date === null ? "—" : daysUntil(date, new Date());

  return (
    <p className="countdown">
      <span className="kicker">Countdown</span>
      <span className="countdown-value">T−{days} D</span>
    </p>
  );
}
