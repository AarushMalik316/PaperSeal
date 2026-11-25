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
    name: "Write Authorization",
    verdict: "denied",
    clearance: "Authorized Issuer — onlyAuthorizedIssuer",
    tier: "RESTRICTED · ISSUER ONLY",
    fn: "issueCertificate / correctCertificate",
    error: "NotAuthorizedIssuer",
    note: "Writing requires an authorized issuer wallet. An unauthorized or revoked wallet trying to issue or correct a certificate is refused by the EVM with NotAuthorizedIssuer(caller) — enforced by the contract, not the page.",
    view: "issuer",
    cta: "Open write-gate demo",
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

export interface ClearanceAccessContext {
  connected: boolean;
  contractReady: boolean;
  loading?: boolean;
  isAdmin: boolean;
  isIssuer: boolean;
}

/**
 * Resolve live per-wallet access across all 6 zones:
 * - Public / no wallet: Zone 03 (Public Verification) only
 * - Admin wallet: Zone 01 (Issuer Authorization) + Zone 03 (Public Verification)
 * - Authorized Issuer wallet: Zones 02, 03, 04, 06 (Zone 05 remains sealed for everyone)
 * - Admin + Authorized Issuer: Zones 01, 02, 03, 04, 06 (Zone 05 remains sealed)
 */
export function resolveZoneVerdict(zoneIndex: number, ctx: ClearanceAccessContext): Verdict {
  const verified = ctx.connected && ctx.contractReady && !ctx.loading;
  const adminOk = verified && ctx.isAdmin;
  const issuerOk = verified && ctx.isIssuer;

  switch (mod6(zoneIndex)) {
    case 0:
      return adminOk ? "granted" : "denied";
    case 1:
      return issuerOk ? "granted" : "denied";
    case 2:
      return "granted";
    case 3:
      return issuerOk ? "granted" : "denied";
    case 4:
      return "denied";
    case 5:
      return issuerOk ? "granted" : "denied";
    default:
      return "denied";
  }
}

export function resolveZoneVerdicts(ctx: ClearanceAccessContext): Verdict[] {
  return ZONES.map((z) => resolveZoneVerdict(z.index, ctx));
}

export function describeWalletRole(ctx: ClearanceAccessContext): string {
  if (!ctx.connected) return "PUBLIC USER · NO WALLET (READ & VERIFY ONLY)";
  if (!ctx.contractReady) return "READ-ONLY PREVIEW · NO LIVE CONTRACT";
  if (ctx.loading) return "CHECKING ON-CHAIN ROLE…";
  if (ctx.isAdmin && ctx.isIssuer) return "INSTITUTION ADMIN + AUTHORIZED ISSUER";
  if (ctx.isAdmin) return "INSTITUTION ADMIN · ADMIN ACCESS";
  if (ctx.isIssuer) return "AUTHORIZED ISSUER · ISSUER ACCESS";
  return "PUBLIC WALLET · READ & VERIFY ONLY";
}

export function getZoneLiveNote(zoneIndex: number, ctx: ClearanceAccessContext, accountHex: string | null): string {
  const idx = mod6(zoneIndex);
  if (idx === 2) return "Open to everyone — no wallet needed to verify certificates.";
  if (idx === 4) return "Sealed for all wallets (including Admin and Issuers): v1 can never be overwritten.";
  if (!ctx.connected || !accountHex) return "No wallet connected — public users can only read and verify (Zone 03).";
  if (!ctx.contractReady) return "No live contract configured — showing read-only public access (Zone 03 only).";
  if (ctx.loading) return "Reading your wallet role from the contract…";
  if (idx === 0) {
    return ctx.isAdmin
      ? `Wallet ${accountHex} matches admin() — admin access granted.`
      : `Wallet ${accountHex} is not admin() — contract refuses with NotAdmin().`;
  }
  return ctx.isIssuer
    ? `Wallet ${accountHex} is an authorized issuer — issuer write access granted.`
    : `Wallet ${accountHex} is not an authorized issuer — contract refuses with NotAuthorizedIssuer().`;
}

