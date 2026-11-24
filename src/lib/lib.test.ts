import { describe, expect, it } from "vitest";
import { AbiCoder, Interface, id, keccak256, toUtf8Bytes } from "ethers";
import { readFileSync } from "node:fs";
import { certIdHash, isValidCertId, normalizeCertId } from "../../shared/canonical.js";
import { normalizeBytes32, sha256Hex } from "./hash";
import { deriveVerdict, matchFile, VERDICT_LABELS } from "./verdict";
import { decodeError, findRevertData } from "./errors";
import { REGISTRY_ABI, type VersionRecord } from "./registry";
import { qrPath } from "./qr";

const rec = (version: number, documentHash: string, status: VersionRecord["status"]): VersionRecord => ({
  documentHash,
  issuer: "0x0000000000000000000000000000000000000001",
  issuedAt: 1_780_000_000 + version,
  blockNumber: version,
  version,
  status,
  note: version === 1 ? "B.Sc. Distributed Systems" : "FIX",
});
const H1 = "0x" + "11".repeat(32);
const H2 = "0x" + "22".repeat(32);
const lookup = (history: VersionRecord[]) => ({ kind: "found" as const, lookup: { certId: "CERT-2026-SYN-001", certIdHash: certIdHash("CERT-2026-SYN-001"), history } });

describe("canonical certificate ID", () => {
  it("normalises and hashes exactly like the contract tests", () => {
    expect(normalizeCertId("  cert-2026-syn-001 ")).toBe("CERT-2026-SYN-001");
    expect(certIdHash(" cert-2026-syn-001")).toBe(keccak256(toUtf8Bytes("CERT-2026-SYN-001")));
  });
  it("rejects malformed IDs", () => {
    expect(isValidCertId("CERT-2026-SYN-001")).toBe(true);
    expect(isValidCertId("ab")).toBe(false);
    expect(isValidCertId("Jane Doe")).toBe(false);
  });
});

describe("local SHA-256", () => {
  it("matches sha256sum of the bundled samples (Web Crypto)", async () => {
    const original = readFileSync("public/samples/CERT-2026-SYN-001-original.txt");
    const tampered = readFileSync("public/samples/CERT-2026-SYN-001-tampered.txt");
    const a = await sha256Hex(new Uint8Array(original));
    const b = await sha256Hex(new Uint8Array(tampered));
    expect(a).toBe("0x7fa7323de814dab18cd55526122a60d414a8181272272b22997082d151f2512e");
    expect(a).not.toBe(b);
  });
  it("normalises 32-byte hex input", () => {
    expect(normalizeBytes32("AB".repeat(32))).toBe("0x" + "ab".repeat(32));
    expect(normalizeBytes32("0x1234")).toBeNull();
  });
});

describe("verdict", () => {
  it("never reports config or RPC problems as an invalid certificate", () => {
    expect(deriveVerdict({ kind: "unconfigured", certId: "X" }, { kind: "none" })?.label).toBe(VERDICT_LABELS.unconfigured);
    expect(deriveVerdict({ kind: "rpc-error", certId: "X", message: "x" }, { kind: "none" })?.label).toBe(
      "Unable to Check (Network / RPC Error)",
    );
  });
  it("covers all certificate states", () => {
    const hashed = (hash: string) => ({ kind: "hashed" as const, fileName: "f", size: 1, hash });
    expect(deriveVerdict(lookup([]), { kind: "none" })?.label).toBe("Not Found");
    expect(deriveVerdict(lookup([rec(1, H1, "Current")]), { kind: "none" })?.label).toBe("Verified · Current");
    expect(deriveVerdict(lookup([rec(1, H1, "Current")]), hashed(H1))?.fileMatch).toEqual({ kind: "match", version: 1, isLatest: true });
    expect(deriveVerdict(lookup([rec(1, H1, "Current")]), hashed(H2))?.label).toBe("Fingerprint Mismatch");
    expect(deriveVerdict(lookup([rec(1, H1, "Superseded"), rec(2, H2, "Current")]), hashed(H1))?.label).toBe("Superseded by Correction");
    expect(deriveVerdict(lookup([rec(1, H1, "Superseded"), rec(2, H1, "Revoked")]), hashed(H1))?.label).toBe("Revoked");
  });
  it("matchFile prefers the latest matching version", () => {
    expect(matchFile([rec(1, H1, "Superseded"), rec(2, H2, "Current")], H2.toUpperCase().replace("0X", "0x"))).toEqual({ kind: "match", version: 2, isLatest: true });
  });
});

describe("contract error decoding", () => {
  const iface = new Interface(REGISTRY_ABI);
  const outsider = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
  const data = iface.encodeErrorResult("NotAuthorizedIssuer", [outsider]);

  it("decodes NotAuthorizedIssuer from nested MetaMask-style errors", () => {
    const err = { code: -32603, message: "Internal JSON-RPC error.", data: { code: 3, message: "execution reverted", data } };
    expect(findRevertData(err)).toBe(data);
    const d = decodeError(err);
    expect(d.kind).toBe("contract-revert");
    expect(d.errorName).toBe("NotAuthorizedIssuer");
    expect(d.signature).toBe(`NotAuthorizedIssuer(${outsider})`);
  });
  it("decodes ethers CALL_EXCEPTION payloads", () => {
    const certHash = certIdHash("CERT-2026-SYN-001");
    const d = decodeError({ code: "CALL_EXCEPTION", data: iface.encodeErrorResult("CertificateAlreadyExists", [certHash]) });
    expect(d.errorName).toBe("CertificateAlreadyExists");
  });
  it("treats wallet cancellation separately from reverts", () => {
    expect(decodeError({ code: 4001, message: "User rejected the request." }).kind).toBe("user-rejected");
  });
  it("ignores unknown selectors", () => {
    const foreign = id("Other(uint256)").slice(0, 10) + AbiCoder.defaultAbiCoder().encode(["uint256"], [1]).slice(2);
    expect(decodeError({ data: foreign }).kind).not.toBe("contract-revert");
  });
});

describe("ABI wiring", () => {
  it("frontend ABI matches the compiled contract artifact (when compiled)", () => {
    let artifact: { abi: unknown } | null = null;
    try {
      artifact = JSON.parse(readFileSync("artifacts/contracts/CertificateRegistry.sol/CertificateRegistry.json", "utf8"));
    } catch {
      /* not compiled in this checkout */
    }
    if (artifact) expect(REGISTRY_ABI).toEqual(artifact.abi);
    const names = (REGISTRY_ABI as { name?: string }[]).map((f) => f.name);
    for (const n of ["authorizeIssuer", "issueCertificate", "correctCertificate", "getCertificateHistory", "NotAuthorizedIssuer"]) expect(names).toContain(n);
  });
});

describe("QR", () => {
  it("encodes the verifier URL into a module path", () => {
    const { path, size } = qrPath("https://example.test/?cert=CERT-2026-SYN-001");
    expect(size).toBeGreaterThanOrEqual(21);
    expect(path.length).toBeGreaterThan(100);
  });
});
