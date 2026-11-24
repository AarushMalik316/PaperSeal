// Right-hand Access Matrix panel: all six zones, required clearance, contract
// rule and verdict, plus the project overview and the spreadsheet comparison.
import { X, ArrowRight, ShieldCheck, ShieldX } from "lucide-react";
import { useApp } from "../state/AppContext";
import { ZONES, VERDICT_TEXT, SUBJECT_ID } from "./zones";
import { PROJECT_OVERVIEW, COMPARISON } from "./copy";
import { NETWORK_LABEL } from "../lib/config";

export function AccessMatrix({ onClose, onSelect }: { onClose: () => void; onSelect: (i: number) => void }) {
  const { activeZone, health, wallet, roles } = useApp();
  const live = health.status === "ok" && Boolean(wallet.account);

  const liveFor = (i: number): string | null => {
    if (!live || roles.loading) return null;
    if (i === 0) return roles.isAdmin ? "Your wallet: admin() ✓" : "Your wallet: not admin";
    if (i === 1 || i === 5) return roles.isIssuer ? "Your wallet: authorized ✓" : "Your wallet: not authorized";
    if (i === 3) return roles.isIssuer ? "Your wallet is authorized" : "Your wallet would be refused";
    return null;
  };

  return (
    <aside
      className="hud-fade fixed bottom-3 right-3 top-[76px] z-[45] flex w-[min(520px,calc(100vw-24px))] flex-col overflow-hidden rounded-[14px] border border-edge bg-panel/95 max-[760px]:top-[54vh] max-[760px]:w-[calc(100vw-24px)] [@media(max-height:760px)]:top-[54vh]"
      aria-labelledby="matrix-title"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div>
          <p className="eyebrow">Live clearance summary · {NETWORK_LABEL}</p>
          <h2 id="matrix-title" className="text-[22px] font-semibold tracking-tight">
            Access Matrix
          </h2>
        </div>
        <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-[8px] border border-edge hover:border-amber" aria-label="Close Access Matrix">
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="mb-3 text-[13px] text-muted">
          Subject <span className="font-mono text-ink">{SUBJECT_ID}</span>. Each zone is a rule written into CertificateRegistry.sol. Verdicts describe the contract&apos;s rules; live results come from the consoles.
        </p>
        <ul className="flex flex-col gap-2">
          {ZONES.map((z) => {
            const ok = z.verdict === "granted";
            const lf = liveFor(z.index);
            return (
              <li key={z.code}>
                <button
                  type="button"
                  onClick={() => onSelect(z.index)}
                  aria-current={activeZone === z.index ? "true" : undefined}
                  className={`grid w-full grid-cols-[44px_1fr_auto] items-center gap-3 rounded-[10px] border px-3 py-2.5 text-left transition-colors ${activeZone === z.index ? "border-amber bg-[#1c212b]" : "border-line hover:border-edge"}`}
                >
                  <span className="font-mono text-[18px] font-semibold text-ink/90">{z.code}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold">{z.name}</span>
                    <span className="block truncate font-mono text-[11px] text-muted">{z.clearance}</span>
                    <span className="block truncate font-mono text-[11px] text-muted">
                      {z.fn}
                      {z.error ? ` → ${z.error}()` : ""}
                    </span>
                    {lf && <span className="mt-0.5 block font-mono text-[11px] text-amber">{lf}</span>}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 rounded-[6px] px-2 py-1 font-mono text-[10.5px] font-semibold ${ok ? "glow-go text-go" : "glow-stop text-stop"}`}>
                    {ok ? <ShieldCheck size={13} aria-hidden="true" /> : <ShieldX size={13} aria-hidden="true" />}
                    {ok ? "GRANTED" : "DENIED"}
                    <span className="sr-only">{VERDICT_TEXT[z.verdict]}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <section className="mt-6 border-t border-line pt-5" aria-labelledby="overview-h">
          <p className="eyebrow mb-2">Project overview</p>
          <h3 id="overview-h" className="text-[18px] font-semibold">What PaperSeal does</h3>
          <p className="mt-2 text-[14px] leading-relaxed text-ink/80">{PROJECT_OVERVIEW}</p>
        </section>

        <section className="mt-6 border-t border-line pt-5" aria-labelledby="sheet-h">
          <p className="eyebrow mb-2">The question judges ask</p>
          <h3 id="sheet-h" className="text-[18px] font-semibold">Why not a shared spreadsheet?</h3>
          <dl className="mt-3 flex flex-col gap-2">
            {COMPARISON.map((c) => (
              <div key={c.topic} className="rounded-[10px] border border-line p-3">
                <dt className="text-[14px] font-semibold">{c.topic}</dt>
                <dd className="mt-1 grid gap-1 text-[13px] sm:grid-cols-2 sm:gap-3">
                  <span className="text-muted">
                    <span className="block font-mono text-[10px] uppercase tracking-[0.12em]">Spreadsheet</span>
                    {c.sheet}
                  </span>
                  <span className="text-ink/90">
                    <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-go">PaperSeal</span>
                    {c.seal}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <p className="mt-5 flex items-center gap-1 text-[12px] text-muted">
          Select a zone to open its dossier <ArrowRight size={12} aria-hidden="true" />
        </p>
      </div>
    </aside>
  );
}
