import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { onTestFinished } from "vitest";
import { buildApp } from "../../src/server/app.js";

// An app over a temp data dir holding the given files; both are cleaned up when the test ends,
// even if it fails
export async function appWithFiles(names: string[]) {
  const dataDir = await mkdtemp(join(tmpdir(), "eclipses-"));
  await Promise.all(names.map((name) => writeFile(join(dataDir, name), "{}")));
  const tempApp = buildApp({ dataDir });
  onTestFinished(async () => {
    await tempApp.close();
    await rm(dataDir, { recursive: true });
  });
  return tempApp;
}
