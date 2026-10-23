import { formatEclipseDate } from "../utils.js";

type EclipsePickerProps = {
  dates: string[];
  date: string | null;
  onChange: (date: string) => void;
};

export function EclipsePicker({ dates, date, onChange }: EclipsePickerProps) {
  // No dates yet, or the request failed: nothing to pick, and no made-up default (A4)
  const empty = dates.length === 0;

  return (
    <label className="eclipse-picker">
      <span className="kicker">Eclipse</span>
      <select
        value={date ?? ""}
        disabled={empty}
        onChange={(event) => onChange(event.target.value)}
      >
        {empty ? (
          <option value="">—</option>
        ) : (
          dates.map((option) => (
            <option key={option} value={option}>
              {formatEclipseDate(option)}
            </option>
          ))
        )}
      </select>
    </label>
  );
}
