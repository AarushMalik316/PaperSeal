// Canonical certificate identifier rule — shared by the contract tests and the
// PaperSeal frontend so issuance and lookups always hash identically.
//
//   certIdHash = keccak256(utf8Bytes(certId.trim().toUpperCase()))
//
// The plain-text certificate ID never goes on-chain; only this hash does.
import { keccak256, toUtf8Bytes } from "ethers";

/** Normalise a human-entered certificate ID (trim + upper-case). */
export function normalizeCertId(certId) {
  return String(certId ?? "").trim().toUpperCase();
}

/** bytes32 hex of the canonical certificate ID. */
export function certIdHash(certId) {
  return keccak256(toUtf8Bytes(normalizeCertId(certId)));
}

/** Allowed shape for synthetic IDs: 3–64 chars of A–Z, 0–9, '-', '_' or '.'. */
export const CERT_ID_PATTERN = /^[A-Z0-9][A-Z0-9._-]{2,63}$/;

export function isValidCertId(certId) {
  return CERT_ID_PATTERN.test(normalizeCertId(certId));
}
