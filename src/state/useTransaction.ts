// Tracks one contract write through: pre-flight simulation → Awaiting Signature
// → Pending Confirmation → Confirmed (only after tx.wait() resolves with
// status 1) or Failed / Reverted. Receipts are built from the real receipt.
import { useCallback, useRef, useState } from "react";
import type { Contract, ContractTransactionResponse, TransactionReceipt } from "ethers";
import { useApp } from "./AppContext";
import { getRegistry, parseRegistryLog } from "../lib/registry";
import { getSigner } from "../lib/wallet";
import { decodeError, type DecodedError } from "../lib/errors";
import { NETWORK_LABEL, TARGET_CHAIN_NAME } from "../lib/config";

export interface TxMeta {
  action: string;
  certId?: string;
  subject?: string;
}

export interface ConfirmedReceipt extends TxMeta {
  txHash: string;
  from: string;
  blockNumber: number;
  timestamp: number;
  version?: number;
  network: string;
}

export type TxState =
  | { phase: "idle" }
  | { phase: "preflight"; meta: TxMeta }
  | { phase: "awaiting-signature"; meta: TxMeta }
  | { phase: "pending"; meta: TxMeta; hash: string }
  | { phase: "confirmed"; meta: TxMeta; hash: string; receipt: ConfirmedReceipt }
  | {
      phase: "failed";
      meta: TxMeta;
      stage: "precondition" | "preflight" | "signature" | "mined";
      error: DecodedError;
      hash?: string;
      revertedOnChain?: boolean;
    };

export interface RunOptions {
  meta: TxMeta;
  /** Simulate against the live contract first (eth_call). Throws on revert. */
  preflight?: (registry: Contract) => Promise<unknown>;
  send: (registry: Contract) => Promise<ContractTransactionResponse>;
  /** If preflight reverts, record the failure but still broadcast (used to obtain a reverted tx hash). */
  broadcastEvenIfPreflightFails?: boolean;
}

export function useTransaction() {
  const { config, provider, wallet, onTargetChain } = useApp();
  const [state, setState] = useState<TxState>({ phase: "idle" });
  const busy = useRef(false);

  const reset = useCallback(() => setState({ phase: "idle" }), []);

  const run = useCallback(
    async ({ meta, preflight, send, broadcastEvenIfPreflightFails }: RunOptions): Promise<TxState> => {
      if (busy.current) return state;
      const fail = (s: Omit<Extract<TxState, { phase: "failed" }>, "phase" | "meta">): TxState => {
        const next: TxState = { phase: "failed", meta, ...s };
        setState(next);
        return next;
      };
      if (!config.address) {
        return fail({
          stage: "precondition",
          error: { kind: "unknown", title: "Contract not configured", message: "Set VITE_CONTRACT_ADDRESS in .env (see Setup)." },
        });
      }
      if (!provider || !wallet.account) {
        return fail({
          stage: "precondition",
          error: { kind: "no-wallet", title: "Wallet not connected", message: "Connect MetaMask to send transactions." },
        });
      }
      if (!onTargetChain) {
        return fail({
          stage: "precondition",
          error: {
            kind: "wrong-network",
            title: "Wrong network",
            message: `Your wallet is on chain ${wallet.chainId ?? "?"}. Switch to ${TARGET_CHAIN_NAME} (${NETWORK_LABEL}) and retry.`,
          },
        });
      }

      busy.current = true;
      let preflightError: DecodedError | null = null;
      try {
        const signer = await getSigner(provider);
        const registry = getRegistry(config.address, signer);

        if (preflight) {
          setState({ phase: "preflight", meta });
          try {
            await preflight(registry);
          } catch (e) {
            preflightError = decodeError(e);
            if (!broadcastEvenIfPreflightFails || preflightError.kind !== "contract-revert") {
              return fail({ stage: "preflight", error: preflightError });
            }
          }
        }

        setState({ phase: "awaiting-signature", meta });
        let tx: ContractTransactionResponse;
        try {
          tx = await send(registry);
        } catch (e) {
          return fail({ stage: "signature", error: decodeError(e) });
        }

        setState({ phase: "pending", meta, hash: tx.hash });
        let receipt: TransactionReceipt | null;
        try {
          receipt = await tx.wait();
        } catch (e) {
          const err = e as { receipt?: TransactionReceipt };
          const reverted = err.receipt?.status === 0;
          const decoded = decodeError(e);
          return fail({
            stage: "mined",
            hash: tx.hash,
            revertedOnChain: reverted,
            error:
              reverted && preflightError
                ? {
                    ...preflightError,
                    title: `Reverted on-chain (status 0): ${preflightError.errorName ?? "contract revert"}`,
                  }
                : decoded,
          });
        }
        if (!receipt || receipt.status !== 1) {
          return fail({
            stage: "mined",
            hash: tx.hash,
            revertedOnChain: true,
            error: preflightError ?? { kind: "contract-revert", title: "Reverted on-chain", message: "The transaction was mined but reverted." },
          });
        }

        const block = await receipt.getBlock();
        let version: number | undefined;
        for (const log of receipt.logs) {
          const ev = parseRegistryLog(log);
          if (ev?.args.version) version = Number(ev.args.version);
        }
        const confirmed: ConfirmedReceipt = {
          ...meta,
          txHash: receipt.hash,
          from: receipt.from,
          blockNumber: receipt.blockNumber,
          timestamp: block.timestamp,
          version,
          network: NETWORK_LABEL,
        };
        const next: TxState = { phase: "confirmed", meta, hash: receipt.hash, receipt: confirmed };
        setState(next);
        return next;
      } finally {
        busy.current = false;
      }
    },
    [config.address, provider, wallet.account, wallet.chainId, onTargetChain, state],
  );

  return { state, run, reset };
}
