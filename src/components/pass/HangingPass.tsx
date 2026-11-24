// Interactive hanging lanyard + dark anodized certificate pass.
// Pendulum swing (rotateZ from the strap anchor) + perspective tilt + 180° flip,
// built with Motion and CSS 3D transforms only. Honours prefers-reduced-motion.
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { RotateCcw, ScanLine, ExternalLink as ExternalIcon } from "lucide-react";
import { NETWORK_LABEL, verifyUrl } from "../../lib/config";
import { formatUtc, shortHex } from "../../lib/format";
import { StatusStamp, PaperSealMark } from "../decor/Marks";
import { QrCode } from "./QrCode";
import type { PassData, PassTone } from "./types";
import { Button } from "../ui";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

interface HangingPassProps {
  pass: PassData;
  strapHeight?: number;
  /** Shown above the pass, e.g. "Live from contract". */
  caption?: ReactNode;
}

export function HangingPass({ pass, strapHeight = 190, caption }: HangingPassProps) {
  const reduce = useReducedMotion() ?? false;
  const [flipped, setFlipped] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const lastX = useRef<number | null>(null);
  const descId = useId();

  const swingTarget = useMotionValue(0);
  const swing = useSpring(swingTarget, { stiffness: 50, damping: 6.5, mass: 1 });
  const tiltXTarget = useMotionValue(0);
  const tiltYTarget = useMotionValue(0);
  const tiltX = useSpring(tiltXTarget, { stiffness: 150, damping: 18 });
  const tiltY = useSpring(tiltYTarget, { stiffness: 150, damping: 18 });

  // A gentle drop-in swing on mount, settling under spring physics.
  useEffect(() => {
    if (reduce) return;
    // Start displaced, then release: the target change lets the spring swing back to rest.
    swingTarget.jump(-6);
    swing.jump(-6);
    const t = window.setTimeout(() => swingTarget.set(0), 60);
    return () => window.clearTimeout(t);
  }, [reduce, swing, swingTarget]);

  // New certificate → show the front.
  useEffect(() => setFlipped(false), [pass.certId, pass.statusLabel]);

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    const vx = lastX.current == null ? 0 : e.clientX - lastX.current;
    lastX.current = e.clientX;
    swingTarget.set(clamp(nx * 9 + vx * 0.35, -11, 11));
    tiltYTarget.set(clamp(nx * 18, -12, 12));
    tiltXTarget.set(clamp(-ny * 12, -9, 9));
  };
  const onPointerLeave = () => {
    lastX.current = null;
    swingTarget.set(0);
    tiltXTarget.set(0);
    tiltYTarget.set(0);
  };

  const flip = () => setFlipped((f) => !f);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      flip();
    }
  };

  const sideLabel = flipped ? "back (cryptographic proof)" : "front";
  const cardProps = {
    role: "group" as const,
    tabIndex: 0,
    "aria-roledescription": "certificate pass",
    "aria-label": `PaperSeal certificate pass for ${pass.certId}, showing ${sideLabel}. Press Enter or Space to flip.`,
    "aria-describedby": descId,
    onClick: flip,
    onKeyDown,
    className:
      "relative mx-auto h-[540px] w-[min(340px,calc(100vw-56px))] cursor-pointer select-none rounded-[8px] focus-visible:outline-offset-[10px]",
  };

  return (
    <div className="flex w-full flex-col items-center">
      <div
        ref={stageRef}
        className="relative flex w-full justify-center pb-6"
        style={{ perspective: 1400, touchAction: "pan-y" }}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <motion.div
          className="flex flex-col items-center"
          style={reduce ? undefined : { rotateZ: swing, transformOrigin: "50% 0%", transformStyle: "preserve-3d" }}
        >
          <Strap height={strapHeight} />
          <Clasp />
          {reduce ? (
            <div {...cardProps}>{flipped ? <BackFace pass={pass} active /> : <FrontFace pass={pass} active />}</div>
          ) : (
            <motion.div style={{ rotateX: tiltX, rotateY: tiltY, transformStyle: "preserve-3d" }}>
              <motion.div
                {...cardProps}
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 80, damping: 14 }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <Face hidden={flipped}>
                  <FrontFace pass={pass} active={!flipped} />
                </Face>
                <Face hidden={!flipped} back>
                  <BackFace pass={pass} active={flipped} />
                </Face>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </div>
      <p id={descId} className="sr-only">
        Front shows the institution, credential, certificate ID and a QR code to the public verifier. Back shows the document
        fingerprint, issuer wallet, version and contract address.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={flip} icon={flipped ? <RotateCcw size={15} /> : <ScanLine size={15} />} dot={flipped ? "alu" : "amber"} aria-pressed={flipped}>
          {flipped ? "Flip to Front" : "Flip for Proof"}
        </Button>
        {caption}
      </div>
    </div>
  );
}

function Face({ hidden, back = false, children }: { hidden: boolean; back?: boolean; children: ReactNode }) {
  return (
    <div
      className="absolute inset-0"
      aria-hidden={hidden}
      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: back ? "rotateY(180deg)" : undefined,
      }}
    >
      {children}
    </div>
  );
}

/** Woven flat-vector lanyard strap with stitched edges and PAPERSEAL weave. */
function Strap({ height }: { height: number }) {
  return (
    <div aria-hidden="true" className="relative w-[40px] overflow-hidden border-x border-edge bg-[#0a0c10]" style={{ height }}>
      <div className="absolute inset-y-0 left-[5px] border-l border-dashed border-amber/70" />
      <div className="absolute inset-y-0 right-[5px] border-r border-dashed border-amber/70" />
      <div
        className="absolute inset-0 flex items-end justify-center overflow-hidden pb-2 font-mono text-[10px] font-semibold tracking-[0.34em] text-ink/70"
        style={{ writingMode: "vertical-rl" }}
      >
        PAPERSEAL ✦ PAPERSEAL ✦ PAPERSEAL ✦ PAPERSEAL
      </div>
    </div>
  );
}

/** Cut-paper swivel clasp hooking into the card's die-cut punch slot. */
function Clasp() {
  return (
    <svg aria-hidden="true" width="58" height="64" viewBox="0 0 58 64" className="relative z-10 -mb-[34px] -mt-[2px] block">
      {/* strap fold */}
      <path d="M8 0h42l-8 12H16z" fill="#0a0c10" />
      {/* ring */}
      <rect x="13" y="8" width="32" height="14" rx="7" fill="#9aa3b2" stroke="#343c4a" strokeWidth="1.5" />
      <rect x="19" y="12" width="20" height="6" rx="3" fill="#0d0f13" />
      {/* swivel body */}
      <path d="M22 21h14l-2 13h-10z" fill="#7d8798" stroke="#343c4a" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="29" cy="27" r="2" fill="#0d0f13" />
      {/* hook */}
      <path d="M29 33v14c0 6 8 6 8 0v-3" fill="none" stroke="#343c4a" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M29 33v14c0 6 8 6 8 0v-3" fill="none" stroke="#b7bfcc" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

const TONE_FILL: Record<PassTone, string> = { ok: "bg-go", warn: "bg-amber", bad: "bg-stop", neutral: "bg-alu" };
const TONE_GLYPH: Record<PassTone, string> = { ok: "✓", warn: "!", bad: "✕", neutral: "○" };

function StatusChip({ pass }: { pass: PassData }) {
  return (
    <span className="chip text-[12px]">
      <span className={`inline-grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold leading-none text-obsidian ${TONE_FILL[pass.statusTone]}`} aria-hidden="true">
        {TONE_GLYPH[pass.statusTone]}
      </span>
      {pass.statusLabel}
    </span>
  );
}

function CardShell({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0">
      {/* offset layered backing sheet */}
      <div className="absolute inset-0 translate-x-[8px] translate-y-[8px] rounded-[14px] border border-line bg-[#11141a]" />
      <div className="absolute inset-0 overflow-hidden rounded-[14px] border border-edge bg-[linear-gradient(180deg,#1b2029,#13171e)] px-5 pb-5 pt-9">
        {/* die-cut punch slot */}
        <div className="absolute left-1/2 top-[14px] h-[12px] w-[60px] -translate-x-1/2 rounded-full border border-edge bg-obsidian" />
        <div className="absolute inset-x-0 top-0 h-[3px] bg-amber" />
        {children}
      </div>
    </div>
  );
}

function FrontFace({ pass, active }: { pass: PassData; active: boolean }) {
  const url = verifyUrl(pass.certId);
  return (
    <CardShell>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
            <PaperSealMark size={24} />
            PaperSeal
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Certificate pass</span>
        </div>
        <div className="mt-4">
          <StatusChip pass={pass} />
        </div>
        <div className="mt-5 pr-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Issuing institution</p>
          <p className="text-[16px] font-semibold leading-snug">{pass.institution}</p>
        </div>
        <div className="mt-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Credential</p>
          <p className="text-[25px] font-semibold leading-[1.08] tracking-[-0.025em]">{pass.credential}</p>
        </div>
        <div className="mt-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Certificate ID</p>
          <p className="font-mono text-[14px] font-semibold">{pass.certId}</p>
        </div>
        <p className="mt-2 text-[11.5px] leading-snug text-muted">Holder details stay off-chain. Only fingerprints are recorded.</p>
        <div className="mt-auto flex items-end gap-3">
          <QrCode value={url} size={92} label={`QR code linking to the PaperSeal verifier for ${pass.certId}`} />
          <div className="flex min-w-0 flex-col gap-1.5 pb-0.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em]">Scan to verify</span>
            <span className="chip w-fit text-[11px]">
              <span className="inline-block h-2 w-2 rounded-full bg-amber" aria-hidden="true" />
              {NETWORK_LABEL}
            </span>
            {!active && <span className="sr-only">hidden side</span>}
          </div>
        </div>
      </div>
      <StatusStamp tone={pass.statusTone} size={62} className="absolute right-4 top-[66px] rotate-[-12deg]" />
    </CardShell>
  );
}

function BackFace({ pass, active }: { pass: PassData; active: boolean }) {
  const tab = active ? 0 : -1;
  return (
    <CardShell>
      <div className="flex h-full flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-semibold">Cryptographic proof</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            {pass.source === "live" ? "Read from contract" : "Preview · not on-chain"}
          </span>
        </div>
        <ProofLine label={pass.documentHashLabel} value={pass.documentHash ?? "—"} />
        <ProofLine label="Authorized issuer wallet" value={pass.issuer ?? "— (no on-chain record shown)"} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip text-[11.5px]">
            <span className="inline-block h-2 w-2 rounded-full bg-go" aria-hidden="true" />0 Bytes On-Chain PII
          </span>
          <span className="chip text-[11.5px]">{pass.statusLabel}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ProofLine label="Version" value={pass.versionLine} plain />
          <ProofLine label="Timestamp" value={pass.timestamp ? formatUtc(pass.timestamp) : "—"} plain />
        </div>
        <ProofLine label="CertificateRegistry.sol" value={pass.contractAddress ?? "Unconfigured (.env)"} />
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted">{NETWORK_LABEL}</span>
          {pass.explorerHref ? (
            <a
              href={pass.explorerHref}
              target="_blank"
              rel="noreferrer noopener"
              tabIndex={tab}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-[10px] border border-edge bg-panel px-2.5 py-1 text-[12px] font-semibold hover:bg-obsidian"
            >
              View on BaseScan <ExternalIcon size={12} aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : (
            <span className="text-[11px] text-muted">{pass.contractAddress ? "No explorer for this chain" : "No explorer link yet"}</span>
          )}
        </div>
      </div>
    </CardShell>
  );
}

function ProofLine({ label, value, plain = false }: { label: string; value: string; plain?: boolean }) {
  return (
    <div className="rounded-[8px] border border-line bg-obsidian px-2.5 py-1.5">
      <p className="font-mono text-[9.5px] font-medium uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className={plain ? "text-[12px] font-semibold leading-snug" : "font-mono text-[11px] leading-snug [overflow-wrap:anywhere]"} title={value}>
        {plain ? value : value.length > 70 ? shortHex(value, 34, 30) : value}
      </p>
    </div>
  );
}
