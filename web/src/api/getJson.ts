// The JSON a GET answers with, failing on any error status or once the signal cancels it
export async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`GET ${url} answered ${response.status}`);
  return (await response.json()) as T;
}
