// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { theme } from "../src/theme.js";

// Turns "--color-bg: #2a3245;" lines into { "--color-bg": "#2a3245" }
function readTokens(css: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const [, name, value] of css.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    tokens[name!] = value!.trim();
  }
  return tokens;
}

describe("theme", () => {
  const cssTokens = readTokens(
    readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8"),
  );

  it("has every theme value in tokens.css with the same value", () => {
    for (const [name, value] of Object.entries(theme)) {
      expect(cssTokens[name], name).toBe(value);
    }
  });

  it("has nothing in tokens.css that theme.ts lacks", () => {
    expect(Object.keys(cssTokens).sort()).toEqual(Object.keys(theme).sort());
  });
});
