// Turns ethers / wallet / RPC errors into friendly, honest explanations.
// Contract custom errors are decoded from the real revert data returned by
// the deployed contract — nothing here invents a reason.
import { registryInterface } from "./registry";
import { shortHex } from "./format";

export type ErrorKind =
  | "contract-revert"
  | "user-rejected"
  | "insufficient-funds"
  | "wrong-network"
  | "no-wallet"
  | "rpc"
  | "unknown";

export interface DecodedError {
  kind: ErrorKind;
  /** Contract custom error name, e.g. "NotAuthorizedIssuer". */
  errorName?: string;
  errorArgs?: string[];
  /** e.g. NotAuthorizedIssuer(0xabc…) */
  signature?: string;
  title: string;
  message: string;
  raw?: string;
}

const HEX = /^0x[0-9a-fA-F]*$/;

/** Walks an error object looking for ABI-encoded revert data. */
export function findRevertData(err: unknown, depth = 0, seen = new Set<unknown>()): string | null {
  if (err == null || depth > 6 || seen.has(err)) return null;
  if (typeof err === "string") {
    return HEX.test(err) && err.length >= 10 && (err.length - 2) % 2 === 0 ? err : null;
  }
  if (typeof err !== "object") return null;
  seen.add(err);
  const obj = err as Record<string, unknown>;
  for (const key of ["data", "revert", "error", "info", "payload", "cause", "originalError", "value"]) {
    if (!(key in obj)) continue;
    const found = findRevertData(obj[key], depth + 1, seen);
    if (found && tryParse(found)) return found;
  }
  // Some providers embed revert data inside a message string.
  const msg = typeof obj.message === "string" ? obj.message : "";
  const m = msg.match(/0x[0-9a-fA-F]{8,}/g);
  if (m) for (const candidate of m) if (tryParse(candidate)) return candidate;
  return null;
}

function tryParse(data: string) {
  try {
    return registryInterface.parseError(data);
  } catch {
    return null;
  }
}

export function explainContractError(name: string, args: string[]): { title: string; message: string } {
  switch (name) {
    case "NotAuthorizedIssuer":
      return {
        title: "Rejected by contract: wallet is not an authorized issuer",
        message: `CertificateRegistry refused this call because ${shortHex(args[0] ?? "this wallet", 8, 6)} is not on the institution's authorized issuer list. The rule lives in the smart contract (onlyAuthorizedIssuer), so no website, script or spreadsheet edit can bypass it.`,
      };
    case "NotAdmin":
      return {
        title: "Rejected by contract: only the institution admin can do this",
        message:
          "Issuer permissions can only be changed by the admin wallet that deployed the contract. Connect the admin wallet and try again.",
      };
    case "CertificateAlreadyExists":
      return {
        title: "Rejected by contract: certificate ID already registered",
        message:
          "This certificate ID already has a version 1 on-chain. Duplicates are refused. To change it, use “Append correction”, which keeps the original version in the history.",
      };
    case "CertificateNotFound":
      return {
        title: "Rejected by contract: certificate not found",
        message: "No certificate with this ID exists yet, so there is nothing to correct or revoke. Check the ID, or issue it first.",
      };
    case "CertificateIsRevoked":
      return {
        title: "Rejected by contract: certificate is revoked",
        message: "A revoked certificate is final. The contract refuses further corrections or revocations.",
      };
    case "InvalidInput":
      return {
        title: `Rejected by contract: invalid ${args[0] ?? "input"}`,
        message:
          args[0] === "newDocumentHash"
            ? "A correction must carry a new, non-empty document fingerprint that differs from the current version."
            : `The contract rejected the value for “${args[0] ?? "input"}”. Fingerprints must be non-zero 32-byte values and notes must be 1–64 bytes.`,
      };
    default:
      return { title: `Rejected by contract: ${name}`, message: "The contract reverted this call." };
  }
}

export function decodeError(err: unknown): DecodedError {
  const e = (err ?? {}) as Record<string, unknown> & { code?: unknown; shortMessage?: string; message?: string };
  const raw = typeof e.shortMessage === "string" ? e.shortMessage : typeof e.message === "string" ? e.message : String(err);
  const info = e.info as { error?: { code?: number } } | undefined;
  const code = e.code ?? info?.error?.code;

  if (code === "ACTION_REJECTED" || code === 4001 || /user (rejected|denied)/i.test(raw)) {
    return {
      kind: "user-rejected",
      title: "Signature cancelled",
      message: "You cancelled the request in your wallet. Nothing was sent to the network.",
      raw,
    };
  }

  const data = findRevertData(err);
  const parsed = data ? tryParse(data) : null;
  if (parsed) {
    const args = parsed.args.map((a) => String(a));
    const { title, message } = explainContractError(parsed.name, args);
    return {
      kind: "contract-revert",
      errorName: parsed.name,
      errorArgs: args,
      signature: `${parsed.name}(${args.join(", ")})`,
      title,
      message,
      raw,
    };
  }

  if (code === "INSUFFICIENT_FUNDS" || /insufficient funds/i.test(raw)) {
    return {
      kind: "insufficient-funds",
      title: "Not enough test ETH",
      message: "This wallet needs a little Base Sepolia test ETH for gas. Use a Base Sepolia faucet, then retry.",
      raw,
    };
  }
  if (code === "CALL_EXCEPTION") {
    return {
      kind: "contract-revert",
      title: "Reverted by the contract",
      message: "The transaction reverted, but the node did not return a decodable reason.",
      raw,
    };
  }
  if (code === "NETWORK_ERROR" || code === "SERVER_ERROR" || code === "TIMEOUT" || /failed to fetch|network/i.test(raw)) {
    return {
      kind: "rpc",
      title: "Network / RPC error",
      message: "Could not reach the blockchain RPC. This is a connection problem, not a verdict about any certificate.",
      raw,
    };
  }
  return { kind: "unknown", title: "Something went wrong", message: raw, raw };
}
