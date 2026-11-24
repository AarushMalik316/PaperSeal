// The six carousel bays of the PaperSeal Clearance Matrix. Each bay is one
// rule that CertificateRegistry.sol enforces. GRANTED / DENIED here is the
// contract's rule as written in the Solidity source — a static explanation,
// not a live on-chain result. Live results come from the Verifier / Issuer /
// Admin consoles, which read the deployed contract.
import type { View } from "../state/AppContext";

export type Verdict = "granted" | "denied";

export interface Zone {
  index: number;
  code: string;
  name: string;
  verdict: Verdict;
  /** Required clearance level, in plain words. */
  clearance: string;
  /** Short tier label for the HUD readout. */
  tier: string;
  /** Contract function this rule is about. */
  fn: string;
  /** Custom error the contract reverts with (denied bays). */
  error?: string;
  note: string;
  view: View;
  cta: string;
  /** Label for the bay's main 3D object. */
  hero: string;
}

export const SUBJECT_ID = "CERT-2026-SYN-001";
export const SUBJECT_TIER = "SYNTHETIC · ZERO PII";

export const ZONES: Zone[] = [
  {
    index: 0,
    code: "01",
    name: "Issuer Authorization",
    verdict: "granted",
    clearance: "Institution Admin — admin()",
    tier: "TIER A · ADMIN",
    fn: "authorizeIssuer",
    note: "The institution admin wallet adds a registrar's wallet to the authorized-issuer list. Only admin() may change the list; any other caller is refused with NotAdmin().",
    view: "admin",
    cta: "Open Institution Admin",
    hero: "Admin Console",
  },
  {
    index: 1,
    code: "02",
    name: "Certificate Issuance",
    verdict: "granted",
    clearance: "Authorized Issuer — onlyAuthorizedIssuer",
    tier: "TIER B · ISSUER",
    fn: "issueCertificate",
    note: "An authorized issuer records version 1: the keccak256 hash of the certificate ID and the SHA-256 fingerprint of the file. No names, student IDs or grades are ever stored.",
    view: "issuer",
    cta: "Open Issuer Desk",
    hero: "Issuance Terminal",
  },
  {
    index: 2,
    code: "03",
    name: "Public Verification",
    verdict: "granted",
    clearance: "None — no wallet required",
    tier: "OPEN · PUBLIC",
    fn: "getCertificateHistory",
    note: "Anyone can read the full record straight from the contract and check their file locally with Web Crypto. Nothing is uploaded and no wallet is needed.",
    view: "verify",
    cta: "Open Public Verifier",
    hero: "Verification Kiosk",
  },
  {
    index: 3,
    code: "04",
    name: "Unauthorized Write",
    verdict: "denied",
    clearance: "Authorized Issuer — wallet not on list",
    tier: "RESTRICTED · ISSUER ONLY",
    fn: "issueCertificate / correctCertificate",
    error: "NotAuthorizedIssuer",
    note: "A wallet the admin never authorized, or later removed, tries to issue or correct a certificate. The EVM reverts with NotAuthorizedIssuer(caller) and nothing is written. The refusal comes from the contract, not the page.",
    view: "issuer",
    cta: "Open unauthorized-action demo",
    hero: "Registry Core",
  },
  {
    index: 4,
    code: "05",
    name: "Overwrite Vault",
    verdict: "denied",
    clearance: "Not permitted for any wallet",
    tier: "SEALED · APPEND-ONLY",
    fn: "issueCertificate (second v1)",
    error: "CertificateAlreadyExists",
    note: "Version 1 can never be re-issued or edited in place. A second v1 for the same ID is refused with CertificateAlreadyExists, and a revoked record refuses every change with CertificateIsRevoked.",
    view: "issuer",
    cta: "Try it in Issuer Desk",
    hero: "Archive Vault",
  },
  {
    index: 5,
    code: "06",
    name: "Correction Ledger",
    verdict: "granted",
    clearance: "Authorized Issuer — onlyAuthorizedIssuer",
    tier: "TIER B · ISSUER",
    fn: "correctCertificate",
    note: "Corrections append a new version marked Current; the previous version stays on-chain forever, marked Superseded. History is never rewritten.",
    view: "issuer",
    cta: "Append a correction",
    hero: "Version Ledger",
  },
];

export const VERDICT_TEXT: Record<Verdict, string> = {
  granted: "ACCESS GRANTED",
  denied: "ACCESS DENIED",
};

export const mod6 = (n: number) => ((n % 6) + 6) % 6;
