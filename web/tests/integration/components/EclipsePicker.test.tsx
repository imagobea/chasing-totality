import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EclipsePicker } from "../../../src/components/EclipsePicker.js";

const DATES = ["2027-08-02", "2028-07-22"];

function picker() {
  return screen.getByRole<HTMLSelectElement>("combobox", { name: /eclipse/i });
}

describe("EclipsePicker", () => {
  afterEach(cleanup);

  it("lists the dates formatted, with the selected one shown", () => {
    render(<EclipsePicker dates={DATES} date="2027-08-02" onChange={() => {}} />);
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "02 AUG 2027",
      "22 JUL 2028",
    ]);
    expect(picker().value).toBe("2027-08-02");
    expect(picker().disabled).toBe(false);
  });

  it("is disabled and shows — without dates", () => {
    render(<EclipsePicker dates={[]} date={null} onChange={() => {}} />);
    expect(picker().disabled).toBe(true);
    expect(screen.getByRole("option").textContent).toBe("—");
  });

  it("reports the picked date", () => {
    const onChange = vi.fn();
    render(<EclipsePicker dates={DATES} date="2027-08-02" onChange={onChange} />);
    fireEvent.change(picker(), { target: { value: "2028-07-22" } });
    expect(onChange).toHaveBeenCalledWith("2028-07-22");
  });
});
