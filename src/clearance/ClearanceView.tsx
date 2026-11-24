// Home experience: full-bleed 3D Clearance carousel behind a security gate,
// with HUD chrome. The 3D engine is loaded lazily the first time Home shows.
import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useApp } from "../state/AppContext";
import { Gate, type GateProgress } from "./Gate";
import { FallbackStage } from "./FallbackStage";
import { AccessMatrix } from "./AccessMatrix";
import { Dossier } from "./Dossier";
import { ZONES, SUBJECT_ID, VERDICT_TEXT, mod6 } from "./zones";
import type { ClearanceStage } from "./stage/ClearanceStage";

declare global {
  interface Window {
    __PS_WEBGL?: boolean;
    __PS_BOOTED?: boolean;
  }
}

type StageState = "idle" | "loading" | "ready" | "failed";
const HINT_KEY = "paperseal.hintDismissed.v1";

function readHint(): boolean {
  try {
    return window.localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
}

function aperture() {
  const small = window.innerWidth < 760 || window.innerHeight < 760;
  return small ? { radius: 84, y: 0.3 } : { radius: 118, y: 0.32 };
}

export function ClearanceView({ active }: { active: boolean }) {
  const { entered, setEntered, matrixOpen, setMatrixOpen, activeZone, setActiveZone, drawer, activePass } = useApp();
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<ClearanceStage | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [stageState, setStageState] = useState<StageState>("idle");
  const [slow, setSlow] = useState(false);
  const [progress, setProgress] = useState<GateProgress>({ step: 0, total: 6, label: "Waiting for renderer" });
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);
  const [dossier, setDossier] = useState<{ zone: number; label: string } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [hintGone, setHintGone] = useState(readHint);
  const reduced = useRef(typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const enteredRef = useRef(entered);
  enteredRef.current = entered;

  const dismissHint = useCallback(() => {
    setHintGone(true);
    try {
      window.localStorage.setItem(HINT_KEY, "1");
    } catch {
      /* storage unavailable */
    }
  }, []);

  // ---- lazy boot of the 3D stage (first time Home is shown)
  const booted = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stageRef.current?.dispose();
      stageRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!active || booted.current || !hostRef.current) return;
    booted.current = true;
    if (window.__PS_WEBGL === false) {
      setStageState("failed");
      return;
    }
    setStageState("loading");
    const watchdog = window.setTimeout(() => mounted.current && setSlow(true), 10_000);
    import("./stage/ClearanceStage")
      .then(async ({ ClearanceStage }) => {
        if (!mounted.current || !hostRef.current) return;
        const stage = new ClearanceStage(
          hostRef.current,
          {
            onProgress: (step, total, label) => setProgress({ step, total, label }),
            onBayChange: (i, byUser) => {
              setActiveZone(i);
              if (byUser) dismissHint();
            },
            onHover: (info) => {
              setHoverLabel((prev) => (prev === (info?.label ?? null) ? prev : info?.label ?? null));
              if (info && tooltipRef.current) tooltipRef.current.style.transform = `translate(${info.x + 16}px, ${info.y + 18}px)`;
            },
            onSelect: (zone, label) => setDossier({ zone, label }),
          },
          { reducedMotion: Boolean(reduced.current), aperture },
        );
        stageRef.current = stage;
        await stage.init();
        if (!mounted.current) return;
        if (enteredRef.current) stage.enter(true);
        window.clearTimeout(watchdog);
        setStageState("ready");
      })
      .catch((err) => {
        console.error("PaperSeal 3D stage failed to start:", err);
        window.clearTimeout(watchdog);
        if (mounted.current) setStageState("failed");
      });
  }, [active, setActiveZone, dismissHint]);

  // pause rendering while another console is on screen
  useEffect(() => {
    stageRef.current?.setPaused(!active);
  }, [active, stageState]);

  useEffect(() => {
    stageRef.current?.setZoom(zoom);
  }, [zoom, stageState]);

  // badge on the 3D subject follows the active zone (and a live lookup, if any)
  useEffect(() => {
    const z = ZONES[activeZone];
    const id = activePass?.source === "live" ? activePass.certId : SUBJECT_ID;
    stageRef.current?.setBadge(id, VERDICT_TEXT[z.verdict], z.verdict === "granted" ? "#10b981" : "#ef4444");
  }, [activeZone, activePass, stageState]);

  const go = useCallback(
    (i: number) => {
      if (stageRef.current && stageState === "ready") stageRef.current.goTo(i);
      else setActiveZone(mod6(i));
    },
    [stageState, setActiveZone],
  );
  const stepBy = useCallback(
    (d: number) => {
      dismissHint();
      if (stageRef.current && stageState === "ready") stageRef.current.step(d);
      else setActiveZone(mod6(activeZone + d));
    },
    [stageState, activeZone, setActiveZone, dismissHint],
  );

  // ---- keyboard rotation
  useEffect(() => {
    if (!active || !entered) return;
    const onKey = (e: KeyboardEvent) => {
      if (dossier || drawer) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable=true]")) return;
      const isSpace = e.key === " ";
      if (isSpace && t !== document.body && t.tagName !== "CANVAS" && !t.closest("[data-stage]")) return;
      if (["ArrowRight", "ArrowDown", "PageDown"].includes(e.key) || (isSpace && !e.shiftKey)) {
        e.preventDefault();
        stepBy(1);
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key) || (isSpace && e.shiftKey)) {
        e.preventDefault();
        stepBy(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, entered, dossier, drawer, stepBy]);

  const showFallback = stageState === "failed" || (slow && stageState !== "ready" && entered);
  const zone = ZONES[activeZone];
  const ok = zone.verdict === "granted";

  return (
    <>
      <section
        ref={hostRef}
        data-stage
        aria-label="3D clearance carousel: six zones of the PaperSeal access matrix. Use arrow keys to rotate."
        className={`stage-host ${matrixOpen && active ? "is-overview" : ""}`}
        style={{ visibility: active ? "visible" : "hidden", zIndex: 0 }}
      >
        {showFallback && <FallbackStage active={activeZone} onSelect={(i) => { go(i); setDossier({ zone: i, label: ZONES[i].hero }); }} />}
      </section>

      {active && !entered && (
        <Gate
          progress={progress}
          ready={stageState === "ready"}
          fallback={stageState === "failed" || slow}
          onEnter={() => stageRef.current?.enter(false)}
          onOpened={() => setEntered(true)}
        />
      )}

      {active && entered && (
        <>
          <p className="sr-only" aria-live="polite">
            Zone {zone.code}, {zone.name}: {VERDICT_TEXT[zone.verdict]}.
          </p>

          {/* top-centre live clearance pill */}
          <div className="hud-fade pointer-events-none fixed left-1/2 top-[92px] z-[45] -translate-x-1/2">
            <div className={`flex items-center gap-2.5 whitespace-nowrap rounded-[8px] border bg-obsidian/90 px-3.5 py-2 font-mono text-[11px] font-semibold tracking-[0.06em] sm:text-[12px] sm:tracking-[0.08em] ${ok ? "glow-go border-go/60" : "glow-stop border-stop/60"}`}>
              <span className={`relative inline-block h-2.5 w-2.5 rounded-full ${ok ? "bg-go" : "bg-stop"}`} aria-hidden="true">
                <span className={`absolute inset-0 animate-ping rounded-full motion-reduce:hidden ${ok ? "bg-go" : "bg-stop"} opacity-60`} />
              </span>
              <span>
                ZONE {zone.code} · <span className={ok ? "text-go" : "text-stop"}>{VERDICT_TEXT[zone.verdict]}</span>
              </span>
            </div>
          </div>

          {/* bottom-left: zone tabs + readout */}
          <nav aria-label="Zones" className="hud-fade fixed bottom-6 left-6 z-[45] max-[760px]:bottom-4 max-[760px]:left-4 max-[760px]:right-4">
            <p className="mb-2 hidden font-mono text-[11px] tracking-[0.12em] text-muted sm:block">
              {zone.tier} · CLEARANCE: {zone.clearance.toUpperCase()}
            </p>
            <p className="mb-2.5 text-[22px] font-semibold leading-tight tracking-tight max-[760px]:text-[17px]">
              <span className="font-mono text-amber">{zone.code}</span> {zone.name}
            </p>
            <div className="flex gap-1.5">
              {ZONES.map((z) => (
                <button
                  key={z.code}
                  type="button"
                  onClick={() => go(z.index)}
                  aria-current={activeZone === z.index ? "true" : undefined}
                  aria-label={`Zone ${z.code}, ${z.name}, ${VERDICT_TEXT[z.verdict]}`}
                  className={`flex h-10 min-w-[52px] items-center justify-center gap-1.5 rounded-[8px] border px-2.5 font-mono text-[13px] font-semibold transition-colors max-[400px]:min-w-0 max-[400px]:flex-1 ${activeZone === z.index ? "border-amber bg-amber/10 text-ink" : "border-edge bg-obsidian/80 text-ink/75 hover:border-muted"}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${z.verdict === "granted" ? "bg-go" : "bg-stop"}`} aria-hidden="true" />
                  {z.code}
                </button>
              ))}
            </div>
          </nav>

          {/* bottom-right: 3-step zoom */}
          {!matrixOpen && !showFallback && (
            <div className="hud-fade fixed bottom-6 right-6 z-[45] flex items-center gap-2 rounded-[10px] border border-edge bg-obsidian/85 p-1.5 max-[760px]:bottom-[124px] max-[760px]:right-4" role="group" aria-label="Zoom">
              <button type="button" onClick={() => setZoom((z) => Math.max(0, z - 1))} disabled={zoom === 0} className="grid h-8 w-8 place-items-center rounded-[6px] hover:bg-alu disabled:opacity-40" aria-label="Zoom out">
                <Minus size={15} aria-hidden="true" />
              </button>
              <span className="flex items-end gap-[3px]" aria-label={`Zoom level ${zoom + 1} of 3`} role="img">
                {[0, 1, 2].map((i) => (
                  <span key={i} className={`w-[4px] rounded-[1px] ${i <= zoom ? "bg-amber" : "bg-edge"}`} style={{ height: 8 + i * 5 }} />
                ))}
              </span>
              <button type="button" onClick={() => setZoom((z) => Math.min(2, z + 1))} disabled={zoom === 2} className="grid h-8 w-8 place-items-center rounded-[6px] hover:bg-alu disabled:opacity-40" aria-label="Zoom in">
                <Plus size={15} aria-hidden="true" />
              </button>
            </div>
          )}

          {/* bottom-centre hint, gone for good after the first rotation */}
          {!hintGone && !matrixOpen && (
            <p className="hud-fade pointer-events-none fixed bottom-8 left-1/2 z-[44] -translate-x-1/2 font-mono text-[12px] tracking-[0.06em] text-ink/60 max-[1100px]:hidden">
              Scroll, drag, or use arrow keys to rotate zones
            </p>
          )}

          {matrixOpen && (
            <AccessMatrix
              onClose={() => setMatrixOpen(false)}
              onSelect={(i) => {
                go(i);
                setDossier({ zone: i, label: ZONES[i].hero });
              }}
            />
          )}

          <div
            ref={tooltipRef}
            className={`pointer-events-none fixed left-0 top-0 z-[46] rounded-[6px] border border-edge bg-obsidian/95 px-2.5 py-1.5 font-mono text-[11.5px] text-ink transition-opacity duration-150 ${hoverLabel && !dossier ? "opacity-100" : "opacity-0"}`}
            aria-hidden="true"
          >
            {hoverLabel} <span className="text-amber">· Inspect ↗</span>
          </div>

          {dossier && <Dossier zoneIndex={dossier.zone} inspected={dossier.label} onClose={() => setDossier(null)} />}
        </>
      )}
    </>
  );
}
