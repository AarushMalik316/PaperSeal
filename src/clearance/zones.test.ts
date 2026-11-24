import { describe, expect, it } from "vitest";
import { ZONES } from "./zones";
import { REGISTRY_ABI } from "../lib/registry";

const names = new Set((REGISTRY_ABI as { name?: string }[]).map((f) => f.name));

describe("Clearance zones", () => {
  it("has six zones: four granted, two denied (04 and 05)", () => {
    expect(ZONES).toHaveLength(6);
    expect(ZONES.filter((z) => z.verdict === "granted").map((z) => z.code)).toEqual(["01", "02", "03", "06"]);
    expect(ZONES.filter((z) => z.verdict === "denied").map((z) => z.code)).toEqual(["04", "05"]);
  });

  it("every zone names real contract functions, and every denied zone a real custom error", () => {
    for (const z of ZONES) {
      for (const fn of z.fn.split("/").map((f) => f.trim().split(" ")[0])) expect(names, `${z.code}: ${fn}`).toContain(fn);
      if (z.verdict === "denied") expect(names, `${z.code}: ${z.error}`).toContain(z.error);
      else expect(z.error).toBeUndefined();
    }
  });
});
