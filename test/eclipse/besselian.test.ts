import { describe, expect, it } from "vitest";
import { evaluate, type BesselianElements } from "../../src/eclipse/besselian.js";

// Round-number coefficients so every expected value can be checked by hand.
const elements: BesselianElements = {
  t0: 10,
  deltaT: 76,
  x: [1, 2, 3, 4],
  y: [-1, 0.5, 0, -0.25],
  d: [10, 1, 0.5],
  mu: [300, 15, 0],
  l1: [0.5, 0.01, -0.001],
  l2: [-0.01, 0.01, -0.001],
  tanF1: 0.0046,
  tanF2: 0.0045,
};

const rad = (degrees: number) => (degrees * Math.PI) / 180;

describe("evaluate", () => {
  it("gives the constant terms at t = 0", () => {
    const at = evaluate(elements, 0);
    expect(at.x).toBeCloseTo(1, 12);
    expect(at.y).toBeCloseTo(-1, 12);
    expect(at.d).toBeCloseTo(rad(10), 12);
    expect(at.mu).toBeCloseTo(rad(300), 12);
    expect(at.l1).toBeCloseTo(0.5, 12);
    expect(at.l2).toBeCloseTo(-0.01, 12);
  });

  it("gives the linear terms as the rates at t = 0", () => {
    const at = evaluate(elements, 0);
    expect(at.xRate).toBeCloseTo(2, 12);
    expect(at.yRate).toBeCloseTo(0.5, 12);
    expect(at.dRate).toBeCloseTo(rad(1), 12);
    expect(at.muRate).toBeCloseTo(rad(15), 12);
  });

  // t = 2 rather than 1, so that t, t² and t³ differ and a wrong power shows up.
  it("sums the polynomials at t = 2 hours after t0", () => {
    const at = evaluate(elements, 2);
    expect(at.x).toBeCloseTo(1 + 2 * 2 + 3 * 4 + 4 * 8, 12); // 49
    expect(at.y).toBeCloseTo(-1 + 0.5 * 2 - 0.25 * 8, 12); // -2
    expect(at.d).toBeCloseTo(rad(10 + 1 * 2 + 0.5 * 4), 12); // 14°
    expect(at.mu).toBeCloseTo(rad(300 + 15 * 2), 12); // 330°
    expect(at.l1).toBeCloseTo(0.5 + 0.01 * 2 - 0.001 * 4, 12); // 0.516
    expect(at.l2).toBeCloseTo(-0.01 + 0.01 * 2 - 0.001 * 4, 12); // 0.006
  });

  it("differentiates the polynomials at t = 2 for the hourly rates", () => {
    const at = evaluate(elements, 2);
    expect(at.xRate).toBeCloseTo(2 + 2 * 3 * 2 + 3 * 4 * 4, 12); // 62
    expect(at.yRate).toBeCloseTo(0.5 + 3 * -0.25 * 4, 12); // -2.5
    expect(at.dRate).toBeCloseTo(rad(1 + 2 * 0.5 * 2), 12); // 3°/h
    expect(at.muRate).toBeCloseTo(rad(15), 12);
  });

  it("works before t0 (negative t)", () => {
    const at = evaluate(elements, -1);
    expect(at.x).toBeCloseTo(1 - 2 + 3 - 4, 12); // -2
    expect(at.xRate).toBeCloseTo(2 - 6 + 12, 12); // 8
  });
});
