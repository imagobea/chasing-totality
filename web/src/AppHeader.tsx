import { ApiStatus } from "./ApiStatus.js";
import logoUrl from "./assets/logo.svg";

export function AppHeader() {
  return (
    <header className="app-header">
      <img className="logo" src={logoUrl} alt="" />
      <h1 className="wordmark">Chasing totality</h1>
      <div className="header-end">
        <ApiStatus />
      </div>
    </header>
  );
}
