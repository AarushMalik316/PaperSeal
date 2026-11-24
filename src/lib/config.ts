// Runtime configuration. Everything here comes from Vite env vars (or the
// optional per-browser override written after an in-app MetaMask deploy).
// Nothing is ever hard-coded as a "live" address.
import { isAddress, getAddress } from "ethers";

export const BASE_SEPOLIA = {
  chainId: 84532,
  chainIdHex: "0x14a34",
  name: "Base Sepolia",
  rpcUrl: "https://sepolia.base.org",
  explorerUrl: "https://sepolia.basescan.org",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
} as const;

const env = import.meta.env;

function parseChainId(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : BASE_SEPOLIA.chainId;
}

export const TARGET_CHAIN_ID = parseChainId(env.VITE_CHAIN_ID);
export const IS_BASE_SEPOLIA = TARGET_CHAIN_ID === BASE_SEPOLIA.chainId;
export const TARGET_CHAIN_HEX = "0x" + TARGET_CHAIN_ID.toString(16);
export const TARGET_CHAIN_NAME = IS_BASE_SEPOLIA
  ? BASE_SEPOLIA.name
  : TARGET_CHAIN_ID === 31337
    ? "Local Hardhat Node"
    : `Chain ${TARGET_CHAIN_ID}`;
/** e.g. "Base Sepolia · 84532" */
export const NETWORK_LABEL = `${TARGET_CHAIN_NAME} · ${TARGET_CHAIN_ID}`;

export const RPC_URL =
  env.VITE_RPC_URL?.trim() || (IS_BASE_SEPOLIA ? BASE_SEPOLIA.rpcUrl : "http://127.0.0.1:8545");

/** Block explorer only exists for Base Sepolia; local chains have none. */
export const EXPLORER_URL = IS_BASE_SEPOLIA ? BASE_SEPOLIA.explorerUrl : null;

export const INSTITUTION_NAME = env.VITE_INSTITUTION_NAME?.trim() || "Northbridge Technical Institute";

export const PUBLIC_APP_URL = env.VITE_PUBLIC_APP_URL?.trim() || "";

export const SAMPLE_CERT_ID = "CERT-2026-SYN-001";
export const SAMPLE_CREDENTIAL = "B.Sc. Distributed Systems";
export const SAMPLE_FILES = [
  { key: "original", label: "Original sample (v1)", path: "/samples/CERT-2026-SYN-001-original.txt" },
  { key: "tampered", label: "Tampered sample", path: "/samples/CERT-2026-SYN-001-tampered.txt" },
  { key: "corrected", label: "Corrected sample (v2)", path: "/samples/CERT-2026-SYN-001-corrected-v2.txt" },
] as const;

export type ContractSource = "env" | "browser";
export interface ContractConfig {
  address: string | null;
  source: ContractSource | null;
  deployBlock: number;
}

const OVERRIDE_KEY = "paperseal.contractOverride.v1";

function normalizeAddress(raw: string | undefined | null): string | null {
  const v = raw?.trim();
  return v && isAddress(v) ? getAddress(v) : null;
}

export const ENV_CONTRACT_ADDRESS = normalizeAddress(env.VITE_CONTRACT_ADDRESS);
export const ENV_CONTRACT_INVALID = Boolean(env.VITE_CONTRACT_ADDRESS?.trim()) && !ENV_CONTRACT_ADDRESS;
const ENV_DEPLOY_BLOCK = Math.max(0, Number(env.VITE_DEPLOY_BLOCK) || 0);

interface StoredOverride {
  address: string;
  chainId: number;
  deployBlock: number;
}

export function readContractConfig(): ContractConfig {
  if (ENV_CONTRACT_ADDRESS) return { address: ENV_CONTRACT_ADDRESS, source: "env", deployBlock: ENV_DEPLOY_BLOCK };
  try {
    const raw = window.localStorage.getItem(OVERRIDE_KEY);
    if (raw) {
      const o = JSON.parse(raw) as StoredOverride;
      const address = normalizeAddress(o.address);
      if (address && o.chainId === TARGET_CHAIN_ID) {
        return { address, source: "browser", deployBlock: Math.max(0, Number(o.deployBlock) || 0) };
      }
    }
  } catch {
    /* storage unavailable — fall through to unconfigured */
  }
  return { address: null, source: null, deployBlock: 0 };
}

export function saveContractOverride(address: string, deployBlock: number): void {
  try {
    const value: StoredOverride = { address: getAddress(address), chainId: TARGET_CHAIN_ID, deployBlock };
    window.localStorage.setItem(OVERRIDE_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function clearContractOverride(): void {
  try {
    window.localStorage.removeItem(OVERRIDE_KEY);
  } catch {
    /* ignore */
  }
}

export function txUrl(hash: string): string | null {
  return EXPLORER_URL ? `${EXPLORER_URL}/tx/${hash}` : null;
}
export function addressUrl(address: string): string | null {
  return EXPLORER_URL ? `${EXPLORER_URL}/address/${address}` : null;
}
export function blockUrl(block: number): string | null {
  return EXPLORER_URL ? `${EXPLORER_URL}/block/${block}` : null;
}

/** URL the pass QR code encodes: opens the Public Verifier for that ID. */
export function verifyUrl(certId: string): string {
  const base =
    PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "/");
  const url = new URL(base, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  url.search = "";
  url.hash = "";
  url.searchParams.set("cert", certId);
  return url.toString();
}
