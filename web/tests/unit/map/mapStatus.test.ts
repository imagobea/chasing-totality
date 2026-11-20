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

  it("calls every listener on each change, until it unsubscribes", () => {
    const store = createMapStatusStore();
    const gone = vi.fn();
    const kept = vi.fn();
    const unsubscribe = store.subscribe(gone);
    store.subscribe(kept);
    store.set({ zoom: 5 });
    unsubscribe();
    store.set({ cursor: null });
    expect(gone).toHaveBeenCalledOnce();
    expect(kept).toHaveBeenCalledTimes(2);
  });
});
