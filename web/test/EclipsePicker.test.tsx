import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EclipsePicker } from "../src/EclipsePicker.js";

const DATES = ["2027-08-02", "2028-07-22"];

describe("EclipsePicker", () => {
  afterEach(cleanup);

  it("lists the dates formatted, with the selected one shown", () => {
    render(<EclipsePicker dates={DATES} date="2027-08-02" onChange={() => {}} />);
    const select = screen.getByRole<HTMLSelectElement>("combobox", { name: /eclipse/i });
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "2027 · AUG 02",
      "2028 · JUL 22",
    ]);
    expect(select.value).toBe("2027-08-02");
    expect(select.disabled).toBe(false);
  });

  it("is disabled and shows — without dates", () => {
    render(<EclipsePicker dates={[]} date={null} onChange={() => {}} />);
    const select = screen.getByRole<HTMLSelectElement>("combobox", { name: /eclipse/i });
    expect(select.disabled).toBe(true);
    expect(screen.getByRole("option").textContent).toBe("—");
  });

  it("reports the picked date", () => {
    const onChange = vi.fn();
    render(<EclipsePicker dates={DATES} date="2027-08-02" onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "2028-07-22" } });
    expect(onChange).toHaveBeenCalledWith("2028-07-22");
  });
});
