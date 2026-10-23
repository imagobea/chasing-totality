import { useEffect, useState } from "react";

type Status = "checking" | "ok" | "down";

const LABELS: Record<Status, string> = {
  checking: "API …",
  ok: "API OK",
  down: "API DOWN",
};

const POLL_INTERVAL_MS = 30_000;

async function fetchStatus(): Promise<Status> {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) return "down";
    const body = (await response.json()) as { status?: string };
    return body.status === "ok" ? "ok" : "down";
  } catch {
    return "down";
  }
}

export function ApiStatus() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    // Ignore answers that arrive after the component has gone away
    let active = true;
    const check = () =>
      void fetchStatus().then((result) => {
        if (active) setStatus(result);
      });
    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // The dot's colour repeats the label, never replaces it (A5)
  return (
    <p className="api-status" role="status" data-status={status}>
      <span className="api-status-dot" aria-hidden="true" />
      {LABELS[status]}
    </p>
  );
}
