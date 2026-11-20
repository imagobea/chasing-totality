import { describe, expect, it, vi } from "vitest";
import { createMapStatusStore } from "../../../src/map/mapStatus.js";

describe("createMapStatusStore", () => {
  it("starts with no cursor and no zoom", () => {
    expect(createMapStatusStore().get()).toEqual({ cursor: null, zoom: null });
  });

  it("keeps each store's status apart", () => {
    const first = createMapStatusStore();
    const second = createMapStatusStore();
    first.set({ zoom: 5 });
    expect(second.get()).toEqual({ cursor: null, zoom: null });
  });

  it("changes only the given field, keeping the other", () => {
    const store = createMapStatusStore();
    store.set({ cursor: { lng: -5.6, lat: 36 } });
    store.set({ zoom: 5.83 });
    expect(store.get()).toEqual({ cursor: { lng: -5.6, lat: 36 }, zoom: 5.83 });
  });

  it("gives a new status on each change, and the same one between changes", () => {
    const store = createMapStatusStore();
    const before = store.get();
    expect(store.get()).toBe(before);
    store.set({ zoom: 5 });
    expect(store.get()).not.toBe(before);
  });

  it("calls every listener on each change", () => {
    const store = createMapStatusStore();
    const first = vi.fn();
    const second = vi.fn();
    store.subscribe(first);
    store.subscribe(second);
    store.set({ zoom: 5 });
    store.set({ cursor: null });
    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(2);
  });

  it("stops calling a listener once it unsubscribes, and keeps calling the others", () => {
    const store = createMapStatusStore();
    const gone = vi.fn();
    const kept = vi.fn();
    const unsubscribe = store.subscribe(gone);
    store.subscribe(kept);
    unsubscribe();
    store.set({ zoom: 5 });
    expect(gone).not.toHaveBeenCalled();
    expect(kept).toHaveBeenCalledOnce();
  });
});
