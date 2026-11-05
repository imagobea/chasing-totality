import { describe, expect, it } from "vitest";
import { isolinesSource } from "../../../src/map/isolines.js";
import { isolines } from "../../helpers/isolines.js";

describe("isolinesSource", () => {
  it("tags the limit, the isoline with the shortest duration, and keeps the rest as given", () => {
    const given = isolines(30, 60, 90);
    const { data } = isolinesSource(given);
    const [limit, ...inner] = data.features;
    expect(data.bbox).toEqual(given.bbox);
    expect(limit?.properties).toEqual({ durationSeconds: 30, name: "30s", limit: true });
    expect(inner).toEqual(given.features.slice(1));
  });
});
