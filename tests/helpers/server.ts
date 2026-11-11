import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { onTestFinished } from "vitest";

// A temp dir holding the given files, by name with their contents, and dirs; it is removed when
// the test ends, even if it fails
export async function tempDir(files: Record<string, string> = {}, dirs: string[] = []) {
  const dir = await mkdtemp(join(tmpdir(), "data-"));
  onTestFinished(() => rm(dir, { recursive: true, force: true }));
  await Promise.all([
    ...Object.entries(files).map(([name, contents]) => writeFile(join(dir, name), contents)),
    ...dirs.map((name) => mkdir(join(dir, name))),
  ]);
  return dir;
}
