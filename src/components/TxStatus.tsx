import { CheckCircle2, Clock, PenLine, ShieldAlert, XCircle, SearchCheck } from "lucide-react";
import type { TxState } from "../state/useTransaction";
import { txUrl } from "../lib/config";
import { ExternalLink, HashBlock, Spinner } from "./ui";
import { ProofReceipt } from "./ProofReceipt";

const STEPS = [
  { key: "preflight", label: "Contract check" },
  { key: "awaiting-signature", label: "Awaiting Signature" },
  { key: "pending", label: "Pending Confirmation" },
  { key: "confirmed", label: "Confirmed" },
] as const;

/** Live transaction state. "Confirmed" only appears after tx.wait() resolved with status 1. */
export function TxStatus({ state, onDismiss }: { state: TxState; onDismiss?: () => void }) {
  if (state.phase === "idle") return null;
  const activeIndex = state.phase === "failed" ? -1 : STEPS.findIndex((s) => s.key === state.phase);

  return (
    <div className="mt-4 flex flex-col gap-3" aria-live="polite">
      {state.phase !== "failed" && (
        <ol className="flex flex-wrap gap-2" aria-label="Transaction progress">
          {STEPS.map((s, i) => {
            const done = i < activeIndex || state.phase === "confirmed";
            const current = i === activeIndex && state.phase !== "confirmed";
            return (
              <li key={s.key} className={`chip ${current ? "" : done ? "" : "border-line text-muted"}`} aria-current={current ? "step" : undefined}>
                {done ? <CheckCircle2 size={14} aria-hidden="true" /> : current ? <Spinner /> : <Clock size={14} aria-hidden="true" />}
                {s.label}
              </li>
            );
          })}
        </ol>
      )}

      {state.phase === "preflight" && <p className="text-sm text-ink/80"><SearchCheck size={14} className="mr-1 inline" aria-hidden="true" />Simulating the call against the live contract…</p>}
      {state.phase === "awaiting-signature" && (
        <p className="text-sm text-ink/80"><PenLine size={14} className="mr-1 inline" aria-hidden="true" />Confirm the transaction in your wallet.</p>
      )}
      {state.phase === "pending" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm">Broadcast. Waiting for the block to confirm — not final yet.</p>
          <HashBlock label="Transaction hash (pending)" value={state.hash} href={txUrl(state.hash)} />
        </div>
      )}

      {state.phase === "confirmed" && <ProofReceipt receipt={state.receipt} />}

      {state.phase === "failed" && (
        <div className="rounded-[8px] border border-edge bg-panel p-4" role="alert">
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-edge ${state.error.kind === "contract-revert" ? "bg-stop" : "bg-amber"}`} aria-hidden="true">
              {state.error.kind === "contract-revert" ? <ShieldAlert size={16} /> : <XCircle size={16} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {state.revertedOnChain ? "Failed / Reverted on-chain" : state.stage === "preflight" ? "Failed · rejected before signing" : "Failed"}
              </p>
              <p className="mt-0.5 font-medium">{state.error.title}</p>
              <p className="mt-1 text-[15px] text-ink/80">{state.error.message}</p>
              {state.error.signature && (
                <div className="mt-2">
                  <HashBlock label="Contract revert (decoded custom error)" value={state.error.signature} />
                </div>
              )}
              {state.hash && (
                <div className="mt-2 flex flex-col gap-1">
                  <HashBlock label="Reverted transaction hash" value={state.hash} href={txUrl(state.hash)} />
                  {txUrl(state.hash) && <ExternalLink href={txUrl(state.hash)!}>Open reverted tx on BaseScan</ExternalLink>}
                </div>
              )}
              {state.stage === "preflight" && state.error.kind === "contract-revert" && (
                <p className="mt-2 text-sm text-muted">
                  The deployed contract returned this revert during an eth_call simulation, so no gas was spent and nothing was written.
                </p>
              )}
            </div>
          </div>
          {onDismiss && (
            <button type="button" className="mt-3 text-sm font-semibold underline underline-offset-4" onClick={onDismiss}>
              Dismiss
            </button>
          )}
        </div>
      )}
    </div>
  );
}
