// Matte-black split security gatefold with a circular optical aperture.
// The live 3D carousel (rendered behind the gate) shows through the aperture.
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Fingerprint } from "lucide-react";
import { SUBJECT_ID, SUBJECT_TIER } from "./zones";

export interface GateProgress {
  step: number;
  total: number;
  label: string;
}

interface Props {
  progress: GateProgress;
  ready: boolean;
  fallback: boolean;
  onEnter: () => void;
  onOpened: () => void;
}

export function Gate({ progress, ready, fallback, onEnter, onOpened }: Props) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const pct = Math.round((Math.min(progress.step, progress.total) / progress.total) * 100);
  const canEnter = ready || fallback;

  useEffect(() => {
    if (canEnter) btnRef.current?.focus({ preventScroll: true });
  }, [canEnter]);

  const enter = () => {
    if (!canEnter || open) return;
    setOpen(true);
    onEnter();
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(onOpened, reduce ? 50 : 1500);
  };

  // magnetic button: drifts slightly toward the cursor
  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
    const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
    el.style.transform = `translate(${dx * 8}px, ${dy * 6}px)`;
  };
  const onLeave = () => {
    if (btnRef.current) btnRef.current.style.transform = "";
  };

  return (
    <div className={`gate ${open ? "is-open" : ""}`} role="dialog" aria-modal="true" aria-labelledby="gate-title" aria-describedby="gate-status">
      <div className="gate-panel left" />
      <div className="gate-panel right" />

      <div className="gate-content pointer-events-none absolute inset-0">
        {/* lens ring with degree ticks around the aperture */}
        <svg
          aria-hidden="true"
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ top: "var(--wy)", width: "calc(var(--wr) * 2 + 44px)", height: "calc(var(--wr) * 2 + 44px)" }}
          viewBox="0 0 280 280"
        >
          <circle cx="140" cy="140" r="134" fill="none" stroke="#343c4a" strokeWidth="10" />
          <circle cx="140" cy="140" r="128" fill="none" stroke="#9aa3b2" strokeWidth="1.2" />
          <circle cx="140" cy="140" r="139" fill="none" stroke="#1e232c" strokeWidth="1" />
          {Array.from({ length: 72 }, (_, i) => {
            const a = (i / 72) * Math.PI * 2;
            const major = i % 6 === 0;
            return (
              <line
                key={i}
                x1={140 + Math.cos(a) * (major ? 129 : 131)}
                y1={140 + Math.sin(a) * (major ? 129 : 131)}
                x2={140 + Math.cos(a) * 138}
                y2={140 + Math.sin(a) * 138}
                stroke={major ? "#f59e0b" : "#6b7484"}
                strokeWidth={major ? 1.6 : 0.8}
              />
            );
          })}
        </svg>

        {/* six vertical signal-meter bars inside the aperture */}
        <div className="absolute left-1/2 flex -translate-x-1/2 items-end gap-[5px]" style={{ top: "calc(var(--wy) + var(--wr) * 0.45)" }} aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <span
              key={i}
              className="w-[6px] rounded-[2px] transition-colors duration-300"
              style={{ height: 10 + i * 4, background: i < progress.step ? "#f59e0b" : "rgba(238,241,246,0.18)" }}
            />
          ))}
        </div>

        {/* lock bar across the seam */}
        <div className="absolute left-1/2 flex -translate-x-1/2" style={{ top: "calc(var(--wy) + var(--wr) + 34px)" }} aria-hidden="true">
          <span className="gate-lockbar l block h-[6px] w-[64px] rounded-l-[3px] border border-edge bg-[#2a303b]" />
          <span className="gate-lockbar r block h-[6px] w-[64px] rounded-r-[3px] border border-edge bg-[#2a303b]" />
        </div>

        {/* credential plate */}
        <div className="absolute left-1/2 w-[min(560px,calc(100vw-40px))] -translate-x-1/2 text-center" style={{ top: "calc(var(--wy) + var(--wr) + 58px)" }}>
          <div className="mx-auto grid grid-cols-2 overflow-hidden rounded-[10px] border border-edge bg-[#0f1217]/90">
            <div className="col-span-2 border-b border-line px-5 pb-4 pt-4">
              <p className="font-mono text-[10.5px] tracking-[0.18em] text-muted">CERTIFICATE OPERATIONS · 6-ZONE ACCESS MATRIX</p>
              <h1 id="gate-title" className="mt-1 text-[clamp(2.2rem,6vw,3.6rem)] font-semibold leading-none tracking-[-0.04em]">
                PaperSeal
              </h1>
              <p className="mt-2 font-mono text-[11px] tracking-[0.12em] text-ink/80">
                CLEARANCE · SUBJECT {SUBJECT_ID} · {SUBJECT_TIER}
              </p>
            </div>
            <div className="border-r border-line px-4 py-2.5 text-left">
              <p className="font-mono text-[10px] tracking-[0.14em] text-muted">LOADER</p>
              <p id="gate-status" className="font-mono text-[13px] font-semibold tracking-[0.08em]" aria-live="polite">
                {fallback && !ready ? "STATIC MODE · 3D UNAVAILABLE" : `${pct >= 100 ? "READY" : "INITIALIZING"} ${String(pct).padStart(3, "0")}%`}
              </p>
            </div>
            <div className="px-4 py-2.5 text-left">
              <p className="font-mono text-[10px] tracking-[0.14em] text-muted">STAGE</p>
              <p className="truncate font-mono text-[12px] text-ink/80">{fallback && !ready ? "2D matrix fallback" : progress.label}</p>
            </div>
          </div>
              {/* magnetic badge-release button */}
          <button
            ref={btnRef}
            type="button"
            onClick={enter}
            onPointerMove={onMove}
            onPointerLeave={onLeave}
            disabled={!canEnter}
            className="pointer-events-auto mt-5 inline-flex items-center gap-2.5 rounded-[10px] border border-amber bg-amber px-5 py-3 font-semibold text-obsidian transition-[opacity,transform] duration-200 disabled:border-edge disabled:bg-[#1b2029] disabled:text-muted"
          >
            <Fingerprint size={18} aria-hidden="true" />
            {canEnter ? "Authenticate & Enter" : "Authenticating…"}
          </button>
        </div>
      </div>
    </div>
  );
}
