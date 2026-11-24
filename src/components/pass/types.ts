import { INSTITUTION_NAME, SAMPLE_CERT_ID, SAMPLE_CREDENTIAL, addressUrl, txUrl } from "../../lib/config";
import type { CertificateLookup } from "../../lib/registry";

export type PassTone = "ok" | "warn" | "bad" | "neutral";

export interface PassData {
  source: "preview" | "live";
  certId: string;
  credential: string;
  institution: string;
  statusLabel: string;
  statusTone: PassTone;
  documentHash: string | null;
  documentHashLabel: string;
  issuer: string | null;
  versionLine: string;
  timestamp: number | null;
  contractAddress: string | null;
  explorerHref: string | null;
}

/** Synthetic preview shown before any real lookup. Clearly labelled; never presented as on-chain. */
export function previewPass(contractAddress: string | null, sampleHash: string | null): PassData {
  return {
    source: "preview",
    certId: SAMPLE_CERT_ID,
    credential: SAMPLE_CREDENTIAL,
    institution: INSTITUTION_NAME,
    statusLabel: "PREVIEW · NOT ON-CHAIN",
    statusTone: "neutral",
    documentHash: sampleHash,
    documentHashLabel: "Sample file SHA-256 (computed locally)",
    issuer: null,
    versionLine: "Not issued — sample preview",
    timestamp: null,
    contractAddress,
    explorerHref: contractAddress ? addressUrl(contractAddress) : null,
  };
}

/** Pass for a certificate read live from the contract. */
export function livePass(lookup: CertificateLookup, contractAddress: string, txHash?: string | null): PassData | null {
  const latest = lookup.history[lookup.history.length - 1];
  if (!latest) return null;
  const v1 = lookup.history[0];
  const tone: PassTone = latest.status === "Current" ? "ok" : latest.status === "Revoked" ? "bad" : "warn";
  return {
    source: "live",
    certId: lookup.certId,
    credential: v1.note,
    institution: INSTITUTION_NAME,
    statusLabel: `v${latest.version} · ${latest.status.toUpperCase()}`,
    statusTone: tone,
    documentHash: latest.documentHash,
    documentHashLabel: "Document SHA-256 fingerprint",
    issuer: latest.issuer,
    versionLine: `Version ${latest.version} of ${lookup.history.length}`,
    timestamp: latest.issuedAt,
    contractAddress,
    explorerHref: txHash ? txUrl(txHash) : addressUrl(contractAddress),
  };
}
