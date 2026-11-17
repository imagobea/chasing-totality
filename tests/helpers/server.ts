import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { onTestFinished } from "vitest";

const DATA_DIR = new URL("../../data/", import.meta.url);

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

// A temp copy of the committed data folder without the named file or folder, removed when the
// test ends
export async function dataDirWithout(name: string) {
  const dir = await tempDir();
  await cp(DATA_DIR, dir, { recursive: true });
  await rm(join(dir, name), { recursive: true });
  return dir;
}
