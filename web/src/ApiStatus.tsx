import { useEffect, useState } from "react";

type Status = "checking" | "ok" | "unreachable";

const LABELS: Record<Status, string> = {
  checking: "API: checking…",
  ok: "API: ok",
  unreachable: "API: unreachable",
};

async function fetchStatus(): Promise<Status> {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) return "unreachable";
    const body = (await response.json()) as { status?: string };
    return body.status === "ok" ? "ok" : "unreachable";
  } catch {
    return "unreachable";
  }
}

export function ApiStatus() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    // Ignore the answer if the component goes away before it arrives
    let active = true;
    void fetchStatus().then((result) => {
      if (active) setStatus(result);
    });
    return () => {
      active = false;
    };
  }, []);

  return <p>{LABELS[status]}</p>;
}
