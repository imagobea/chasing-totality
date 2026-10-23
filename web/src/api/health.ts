// The health endpoint

export type Health = "ok" | "down";

// Never throws: any failure to reach a healthy API reads as down
export async function fetchHealth(): Promise<Health> {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) return "down";
    const body = (await response.json()) as { status?: string };
    return body.status === "ok" ? "ok" : "down";
  } catch {
    return "down";
  }
}
