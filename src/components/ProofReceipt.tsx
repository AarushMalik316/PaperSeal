import { Receipt } from "lucide-react";
import type { ConfirmedReceipt } from "../state/useTransaction";
import { txUrl } from "../lib/config";
import { formatUtc } from "../lib/format";
import { CopyButton, ExternalLink } from "./ui";

/** Copyable on-chain proof receipt, rendered only from confirmed, real data. */
export function ProofReceipt({ receipt, title = "On-chain proof receipt" }: { receipt: ConfirmedReceipt; title?: string }) {
  const explorer = txUrl(receipt.txHash);
  const rows: [string, string][] = [["Action", receipt.action]];
  if (receipt.certId) rows.push(["Certificate ID", receipt.certId]);
  if (receipt.subject) rows.push(["Subject wallet", receipt.subject]);
  rows.push(["Issuer / sender wallet", receipt.from]);
  if (receipt.version !== undefined) rows.push(["Version", `v${receipt.version}`]);
  rows.push(["Timestamp", formatUtc(receipt.timestamp)]);
  rows.push(["Block", String(receipt.blockNumber)]);
  rows.push(["Network", receipt.network]);
  rows.push(["Transaction hash", receipt.txHash]);
  if (explorer) rows.push(["Explorer", explorer]);
  const text = ["PaperSeal · " + title, ...rows.map(([k, v]) => `${k}: ${v}`)].join("\n");

  return (
    <section className="layered rounded-[14px]" aria-label={title}>
      <div className="rounded-[14px] border border-go/40 bg-obsidian p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-[17px] font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-full border border-edge bg-go" aria-hidden="true">
              <Receipt size={15} />
            </span>
            {title} · Confirmed
          </h3>
          <CopyButton value={text} label="Copy receipt" />
        </div>
        <dl className="grid gap-1.5">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-1 gap-0.5 sm:grid-cols-[170px_1fr] sm:gap-3">
              <dt className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">{k}</dt>
              <dd className={`min-w-0 ${/^0x|^https?:/.test(v) ? "mono" : "text-[15px]"}`}>
                {k === "Explorer" ? <ExternalLink href={v}>View on BaseScan</ExternalLink> : v}
              </dd>
            </div>
          ))}
        </dl>
        {!explorer && <p className="mt-2 text-xs text-muted">Local development chain: no public block explorer exists for this receipt.</p>}
      </div>
    </section>
  );
}
