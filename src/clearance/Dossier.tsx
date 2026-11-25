// Zone Access Dossier: unfolds with a 3D rotateX transition.
import { useEffect, useRef } from "react";
import { ArrowRight, ShieldCheck, ShieldX, X } from "lucide-react";
import { useApp } from "../state/AppContext";
import { ZONES, SUBJECT_ID, VERDICT_TEXT, resolveZoneVerdict, getZoneLiveNote, describeWalletRole } from "./zones";
import { shortHex } from "../lib/format";

export function Dossier({ zoneIndex, inspected, onClose }: { zoneIndex: number; inspected: string; onClose: () => void }) {
  const { navigate, health, wallet, roles, activePass } = useApp();
  const zone = ZONES[zoneIndex];
  const accessCtx = {
    connected: Boolean(wallet.account),
    contractReady: health.status === "ok",
    loading: roles.loading,
    isAdmin: roles.isAdmin,
    isIssuer: roles.isIssuer,
  };
  const verdict = resolveZoneVerdict(zoneIndex, accessCtx);
  const ok = verdict === "granted";
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>("button, a[href]");
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [onClose]);

  const accountHex = wallet.account ? shortHex(wallet.account) : null;
  let live: string;
  if (zoneIndex === 2 && health.status === "ok" && activePass?.source === "live") {
    live = `Last lookup: ${activePass.certId} · ${activePass.statusLabel} (read from contract)`;
  } else {
    live = getZoneLiveNote(zoneIndex, accessCtx, accountHex);
  }

  const verdictSub = ok
    ? zoneIndex === 2
      ? "Open to everyone — no wallet needed"
      : `Clearance verified: ${describeWalletRole(accessCtx)}`
    : zoneIndex === 4
      ? `Sealed for all wallets (${zone.error}())`
      : `Requires ${zone.clearance}${zone.error ? ` (reverts with ${zone.error}())` : ""}`;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-obsidian/70 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dossier-title"
        className="dossier-in layered relative max-h-[calc(100dvh-32px)] w-[min(560px,100%)] overflow-y-auto rounded-[14px] border border-edge bg-panel p-6 outline-none sm:p-7"
      >
        <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-[8px] border border-edge hover:border-amber" aria-label="Close dossier">
          <X size={16} aria-hidden="true" />
        </button>
        <p className="eyebrow">Zone access dossier · inspected: {inspected}</p>
        <h2 id="dossier-title" className="mt-2 pr-10 text-[28px] font-semibold leading-tight tracking-tight">
          <span className="font-mono text-[22px] text-amber">ZONE {zone.code}</span> · {zone.name}
        </h2>

        <div className={`mt-5 flex items-center gap-3 rounded-[10px] px-4 py-3.5 ${ok ? "glow-go bg-go/10" : "glow-stop bg-stop/10"}`}>
          {ok ? <ShieldCheck size={30} className="text-go" aria-hidden="true" /> : <ShieldX size={30} className="text-stop" aria-hidden="true" />}
          <div>
            <p className={`text-[24px] font-bold tracking-[0.02em] ${ok ? "text-go" : "text-stop"}`}>{VERDICT_TEXT[verdict]}</p>
            <p className="font-mono text-[11px] text-ink/70">{verdictSub}</p>
          </div>
        </div>

        <dl className="mt-5 grid gap-0">
          {[
            ["Subject ID", SUBJECT_ID],
            ["Required clearance", zone.clearance],
            ["Contract rule", `${zone.fn}${zone.error ? ` → ${zone.error}()` : ""}`],
            ["Tier", zone.tier],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-1 gap-0.5 border-b border-line py-2.5 sm:grid-cols-[160px_1fr] sm:gap-4">
              <dt className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">{k}</dt>
              <dd className={k === "Subject ID" || k === "Contract rule" ? "font-mono text-[13px]" : "text-[14px]"}>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[15px] leading-relaxed text-ink/85">{zone.note}</p>
        <p className="mt-4 rounded-[8px] border border-line bg-obsidian px-3 py-2.5 font-mono text-[12px] text-ink/85">
          <span className="text-amber">LIVE · </span>
          {live}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className="btn btn-accent"
            onClick={() => {
              onClose();
              navigate(zone.view, zone.view === "verify" ? { cert: SUBJECT_ID } : undefined);
            }}
          >
            <span className="btn-dot" aria-hidden="true">
              <ArrowRight size={15} />
            </span>
            {zone.cta}
          </button>
          <button type="button" className="btn btn-plain" onClick={onClose}>
            Back to carousel
          </button>
        </div>
      </div>
    </div>
  );
}
