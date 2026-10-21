import { ApiStatus } from "./ApiStatus.js";
import logoUrl from "./assets/logo.svg";
import { Countdown } from "./Countdown.js";
import { EclipsePicker } from "./EclipsePicker.js";

type AppHeaderProps = {
  dates: string[];
  date: string | null;
  onDateChange: (date: string) => void;
};

export function AppHeader({ dates, date, onDateChange }: AppHeaderProps) {
  return (
    <header className="app-header">
      <img className="logo" src={logoUrl} alt="" />
      <h1 className="wordmark">Chasing totality</h1>
      <EclipsePicker dates={dates} date={date} onChange={onDateChange} />
      <div className="header-end">
        <Countdown date={date} />
        <ApiStatus />
      </div>
    </header>
  );
}
