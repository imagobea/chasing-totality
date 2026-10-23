import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Countdown } from "../src/components/Countdown.js";

describe("Countdown", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows the days left to the eclipse", () => {
    vi.setSystemTime(new Date(2026, 9, 21, 9));
    render(<Countdown date="2027-08-02" />);
    expect(screen.getByText("T−285 D")).toBeTruthy();
  });

  it("stops at 0 once the eclipse is past", () => {
    vi.setSystemTime(new Date(2027, 8, 1));
    render(<Countdown date="2027-08-02" />);
    expect(screen.getByText("T−0 D")).toBeTruthy();
  });

  it("shows — without a date", () => {
    render(<Countdown date={null} />);
    expect(screen.getByText("T−— D")).toBeTruthy();
  });
});
