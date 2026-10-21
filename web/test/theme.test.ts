// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { theme } from "../src/theme.js";

// Turns "--color-bg: #2a3245;" lines into { "--color-bg": "#2a3245" }
// Naive on purpose: breaks on commented-out tokens or values containing ";", so keep tokens.css plain
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

  // The logo is an <img> and the favicon, so it can't read CSS variables
  it("draws the logo in the accent colour", () => {
    const svg = readFileSync(new URL("../src/assets/logo.svg", import.meta.url), "utf8");
    const colours = svg.match(/#[0-9a-f]{3,8}\b/gi) ?? [];
    expect(colours.length).toBeGreaterThan(0);
    for (const colour of colours) expect(colour.toLowerCase()).toBe(theme["--color-accent"]);
  });
});
