// Pure logic that turns a lookup + optional local file fingerprint into a
// verification verdict. Config / RPC problems are never reported as an
// invalid certificate.
import type { CertificateLookup, VersionRecord } from "./registry";

export type LookupState =
  | { kind: "idle" }
  | { kind: "loading"; certId: string }
  | { kind: "unconfigured"; certId: string }
  | { kind: "rpc-error"; certId: string; message: string }
  | { kind: "found"; lookup: CertificateLookup };

export type FileCheck =
  | { kind: "none" }
  | { kind: "hashing"; fileName: string }
  | { kind: "hashed"; fileName: string; size: number; hash: string }
  | { kind: "error"; message: string };

export type VerdictCode =
  | "verified-current"
  | "superseded"
  | "revoked"
  | "fingerprint-mismatch"
  | "not-found"
  | "rpc-error"
  | "unconfigured";

export const VERDICT_LABELS: Record<VerdictCode, string> = {
  "verified-current": "Verified · Current",
  superseded: "Superseded by Correction",
  revoked: "Revoked",
  "fingerprint-mismatch": "Fingerprint Mismatch",
  "not-found": "Not Found",
  "rpc-error": "Unable to Check (Network / RPC Error)",
  unconfigured: "Unconfigured (Contract Not Set)",
};

export type FileMatch =
  | { kind: "match"; version: number; isLatest: boolean }
  | { kind: "mismatch" }
  | null;

export interface Verdict {
  code: VerdictCode;
  label: string;
  tone: "ok" | "warn" | "bad" | "neutral";
  detail: string;
  latest?: VersionRecord;
  fileMatch: FileMatch;
}

export function matchFile(history: VersionRecord[], hash: string): FileMatch {
  const h = hash.toLowerCase();
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].documentHash.toLowerCase() === h) {
      return { kind: "match", version: history[i].version, isLatest: i === history.length - 1 };
    }
  }
  return { kind: "mismatch" };
}

function make(code: VerdictCode, tone: Verdict["tone"], detail: string, extra: Partial<Verdict> = {}): Verdict {
  return { code, label: VERDICT_LABELS[code], tone, detail, fileMatch: null, ...extra };
}

export function deriveVerdict(state: LookupState, file: FileCheck): Verdict | null {
  switch (state.kind) {
    case "idle":
    case "loading":
      return null;
    case "unconfigured":
      return make(
        "unconfigured",
        "neutral",
        "No CertificateRegistry address is configured, so nothing can be checked yet. This says nothing about the certificate itself.",
      );
    case "rpc-error":
      return make(
        "rpc-error",
        "neutral",
        "The Base Sepolia RPC could not be reached. This is a connection problem, not a judgement about the certificate. Try again shortly.",
      );
    case "found": {
      const { history } = state.lookup;
      if (history.length === 0) {
        return make(
          "not-found",
          "bad",
          "The contract has no record for this certificate ID. Check for typos — or treat the certificate as unverified.",
        );
      }
      const latest = history[history.length - 1];
      const fileMatch = file.kind === "hashed" ? matchFile(history, file.hash) : null;

      if (latest.status === "Revoked") {
        return make(
          "revoked",
          "bad",
          `The issuer revoked this certificate in version ${latest.version}. Earlier versions remain visible in the history below.`,
          { latest, fileMatch },
        );
      }
      if (fileMatch?.kind === "mismatch") {
        return make(
          "fingerprint-mismatch",
          "bad",
          "The certificate ID exists, but the file you checked does not match any version recorded on-chain. The file was altered, re-exported or is not the issued document.",
          { latest, fileMatch },
        );
      }
      if (fileMatch?.kind === "match" && !fileMatch.isLatest) {
        return make(
          "superseded",
          "warn",
          `Your file matches version ${fileMatch.version}, which the issuer later replaced with version ${latest.version}. Ask the holder for the current document.`,
          { latest, fileMatch },
        );
      }
      return make(
        "verified-current",
        "ok",
        fileMatch?.kind === "match"
          ? `Record found on-chain and your file matches the current version (v${latest.version}) byte for byte.`
          : `Record found on-chain; version ${latest.version} is current. Check the document file below to confirm it matches.`,
        { latest, fileMatch },
      );
    }
  }
}
