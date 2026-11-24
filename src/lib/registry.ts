// Read-only access to CertificateRegistry over the configured JSON-RPC
// endpoint. No wallet is needed for anything in this file.
import { Contract, Interface, JsonRpcProvider, Network, type Log, type Provider, type Signer } from "ethers";
import artifact from "./contract/CertificateRegistry.json";
import { RPC_URL, TARGET_CHAIN_ID } from "./config";
import { certIdHash, normalizeCertId } from "../../shared/canonical.js";

export const REGISTRY_ABI = artifact.abi;
export const REGISTRY_BYTECODE = artifact.bytecode as string;
export const registryInterface = new Interface(REGISTRY_ABI);

export type CertStatus = "Current" | "Superseded" | "Revoked";
const STATUS_NAMES: Record<number, CertStatus> = { 1: "Current", 2: "Superseded", 3: "Revoked" };

export interface VersionRecord {
  documentHash: string;
  issuer: string;
  issuedAt: number;
  blockNumber: number;
  version: number;
  status: CertStatus;
  note: string;
}

export interface CertificateLookup {
  certId: string;
  certIdHash: string;
  history: VersionRecord[];
}

let cachedProvider: JsonRpcProvider | null = null;

/** Read provider pinned to the target chain (no network auto-detection loop). */
export function getReadProvider(): JsonRpcProvider {
  if (!cachedProvider) {
    cachedProvider = new JsonRpcProvider(RPC_URL, Network.from(TARGET_CHAIN_ID), {
      staticNetwork: true,
      batchMaxCount: 1,
    });
  }
  return cachedProvider;
}

export function getRegistry(address: string, runner?: Provider | Signer): Contract {
  return new Contract(address, REGISTRY_ABI, runner ?? getReadProvider());
}

type RawRecord = {
  documentHash: string;
  issuer: string;
  issuedAt: bigint;
  blockNumber: bigint;
  version: bigint;
  status: bigint;
  note: string;
};

export function toVersionRecord(raw: RawRecord): VersionRecord {
  return {
    documentHash: raw.documentHash.toLowerCase(),
    issuer: raw.issuer,
    issuedAt: Number(raw.issuedAt),
    blockNumber: Number(raw.blockNumber),
    version: Number(raw.version),
    status: STATUS_NAMES[Number(raw.status)] ?? "Superseded",
    note: raw.note,
  };
}

export async function fetchCertificate(address: string, certId: string): Promise<CertificateLookup> {
  const normalized = normalizeCertId(certId);
  const hash = certIdHash(normalized);
  const raw = (await getRegistry(address).getCertificateHistory(hash)) as RawRecord[];
  return { certId: normalized, certIdHash: hash, history: raw.map(toVersionRecord) };
}

export interface Health {
  status: "unconfigured" | "checking" | "ok" | "rpc-error" | "chain-mismatch" | "no-code";
  latestBlock?: number;
  rpcChainId?: number;
  error?: string;
  checkedAt?: number;
}

/** Confirms the RPC answers, is on the target chain and that code exists at the address. */
export async function checkHealth(address: string | null): Promise<Health> {
  if (!address) return { status: "unconfigured" };
  const provider = getReadProvider();
  try {
    const [chainHex, latestBlock, code] = await Promise.all([
      provider.send("eth_chainId", []) as Promise<string>,
      provider.getBlockNumber(),
      provider.getCode(address),
    ]);
    const rpcChainId = Number(BigInt(chainHex));
    const checkedAt = Date.now();
    if (rpcChainId !== TARGET_CHAIN_ID) return { status: "chain-mismatch", rpcChainId, latestBlock, checkedAt };
    if (!code || code === "0x") return { status: "no-code", rpcChainId, latestBlock, checkedAt };
    return { status: "ok", rpcChainId, latestBlock, checkedAt };
  } catch (e) {
    return { status: "rpc-error", error: e instanceof Error ? e.message : String(e), checkedAt: Date.now() };
  }
}

export async function fetchAdmin(address: string): Promise<string> {
  return (await getRegistry(address).admin()) as string;
}

export async function fetchIsAuthorized(address: string, account: string): Promise<boolean> {
  return (await getRegistry(address).isAuthorizedIssuer(account)) as boolean;
}

export async function fetchAuthorizedIssuers(address: string): Promise<string[]> {
  return [...((await getRegistry(address).getAuthorizedIssuers()) as string[])];
}

export async function fetchTotalCertificates(address: string): Promise<number> {
  return Number((await getRegistry(address).totalCertificates()) as bigint);
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type RegistryEventName =
  | "IssuerAuthorized"
  | "IssuerDeauthorized"
  | "CertificateIssued"
  | "CertificateCorrected"
  | "CertificateRevoked";

export const EVENT_NAMES: RegistryEventName[] = [
  "IssuerAuthorized",
  "IssuerDeauthorized",
  "CertificateIssued",
  "CertificateCorrected",
  "CertificateRevoked",
];

export interface RegistryEvent {
  name: RegistryEventName;
  txHash: string;
  blockNumber: number;
  logIndex: number;
  args: Record<string, string>;
}

const TOPICS = EVENT_NAMES.map((n) => registryInterface.getEvent(n)!.topicHash);
const CERT_TOPICS = (["CertificateIssued", "CertificateCorrected", "CertificateRevoked"] as const).map(
  (n) => registryInterface.getEvent(n)!.topicHash,
);

export function parseRegistryLog(log: Log): RegistryEvent | null {
  try {
    const parsed = registryInterface.parseLog({ topics: [...log.topics], data: log.data });
    if (!parsed) return null;
    const args: Record<string, string> = {};
    parsed.fragment.inputs.forEach((input, i) => {
      args[input.name] = String(parsed.args[i]);
    });
    return {
      name: parsed.name as RegistryEventName,
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      logIndex: log.index,
      args,
    };
  } catch {
    return null;
  }
}

export interface EventScan {
  events: RegistryEvent[];
  fromBlock: number;
  toBlock: number;
  reachedDeployBlock: boolean;
}

/**
 * Scans backwards from the latest block in chunks (public RPCs cap eth_getLogs
 * ranges) until `deployBlock`, `maxEvents` or `maxChunks` is reached.
 */
export async function fetchRecentEvents(
  address: string,
  deployBlock: number,
  { chunkSize = 9_000, maxChunks = 12, maxEvents = 40 } = {},
): Promise<EventScan> {
  const provider = getReadProvider();
  const latest = await provider.getBlockNumber();
  const events: RegistryEvent[] = [];
  let to = latest;
  let size = chunkSize;
  let chunks = 0;
  let lowest = latest;
  while (to >= deployBlock && chunks < maxChunks && events.length < maxEvents) {
    const from = Math.max(deployBlock, to - size + 1);
    let logs: Log[];
    try {
      logs = await provider.getLogs({ address, fromBlock: from, toBlock: to, topics: [TOPICS] });
    } catch (e) {
      if (size > 500) {
        size = Math.floor(size / 2); // RPC rejected the range: retry smaller.
        continue;
      }
      throw e;
    }
    for (const log of logs) {
      const ev = parseRegistryLog(log);
      if (ev) events.push(ev);
    }
    lowest = from;
    to = from - 1;
    chunks++;
  }
  events.sort((a, b) => b.blockNumber - a.blockNumber || b.logIndex - a.logIndex);
  return {
    events: events.slice(0, maxEvents),
    fromBlock: lowest,
    toBlock: latest,
    reachedDeployBlock: lowest <= deployBlock,
  };
}

/**
 * Finds the transaction that wrote a given version. Each VersionRecord stores
 * its block number, so this is a single-block log query.
 */
export async function findVersionTx(
  address: string,
  certHash: string,
  record: VersionRecord,
): Promise<RegistryEvent | null> {
  const logs = await getReadProvider().getLogs({
    address,
    fromBlock: record.blockNumber,
    toBlock: record.blockNumber,
    topics: [CERT_TOPICS, certHash],
  });
  for (const log of logs) {
    const ev = parseRegistryLog(log);
    if (ev && Number(ev.args.version) === record.version) return ev;
  }
  return null;
}
