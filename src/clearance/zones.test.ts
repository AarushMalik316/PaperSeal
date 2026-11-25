import { describe, expect, it } from "vitest";
import { describeWalletRole, getZoneLiveNote, resolveZoneVerdicts, ZONES } from "./zones";
import { REGISTRY_ABI } from "../lib/registry";

const names = new Set((REGISTRY_ABI as { name?: string }[]).map((f) => f.name));

describe("Clearance zones", () => {
  it("has six zones: four baseline granted, two denied (04 and 05)", () => {
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

describe("Per-wallet zone verdicts", () => {
  it("grants only Zone 03 when no wallet is connected or contract is unconfigured", () => {
    expect(
      resolveZoneVerdicts({ connected: false, contractReady: true, isAdmin: false, isIssuer: false }),
    ).toEqual(["denied", "denied", "granted", "denied", "denied", "denied"]);

    expect(
      resolveZoneVerdicts({ connected: true, contractReady: false, isAdmin: true, isIssuer: true }),
    ).toEqual(["denied", "denied", "granted", "denied", "denied", "denied"]);

    expect(
      resolveZoneVerdicts({ connected: true, contractReady: true, loading: true, isAdmin: true, isIssuer: true }),
    ).toEqual(["denied", "denied", "granted", "denied", "denied", "denied"]);
  });

  it("grants only Zone 03 to a connected normal public wallet", () => {
    const ctx = { connected: true, contractReady: true, isAdmin: false, isIssuer: false };
    expect(resolveZoneVerdicts(ctx)).toEqual(["denied", "denied", "granted", "denied", "denied", "denied"]);
    expect(describeWalletRole(ctx)).toBe("PUBLIC WALLET · READ & VERIFY ONLY");
  });

  it("grants Zone 01 (Admin) and Zone 03 (Public) to an Admin-only wallet", () => {
    const ctx = { connected: true, contractReady: true, isAdmin: true, isIssuer: false };
    expect(resolveZoneVerdicts(ctx)).toEqual(["granted", "denied", "granted", "denied", "denied", "denied"]);
    expect(describeWalletRole(ctx)).toBe("INSTITUTION ADMIN · ADMIN ACCESS");
    expect(getZoneLiveNote(0, ctx, "0xAbCd...1234")).toContain("admin access granted");
    expect(getZoneLiveNote(1, ctx, "0xAbCd...1234")).toContain("NotAuthorizedIssuer");
  });

  it("grants Issuer zones (02, 03, 04, 06) to an Authorized Issuer wallet while keeping 01 and 05 denied", () => {
    const ctx = { connected: true, contractReady: true, isAdmin: false, isIssuer: true };
    expect(resolveZoneVerdicts(ctx)).toEqual(["denied", "granted", "granted", "granted", "denied", "granted"]);
    expect(describeWalletRole(ctx)).toBe("AUTHORIZED ISSUER · ISSUER ACCESS");
    expect(getZoneLiveNote(4, ctx, "0xAbCd...1234")).toContain("Sealed for all wallets");
  });

  it("grants all non-sealed zones (01, 02, 03, 04, 06) when wallet is both Admin and Authorized Issuer", () => {
    const ctx = { connected: true, contractReady: true, isAdmin: true, isIssuer: true };
    expect(resolveZoneVerdicts(ctx)).toEqual(["granted", "granted", "granted", "granted", "denied", "granted"]);
    expect(describeWalletRole(ctx)).toBe("INSTITUTION ADMIN + AUTHORIZED ISSUER");
  });
});

