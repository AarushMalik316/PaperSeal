// Geometric marks for the Clearance design language. Local SVG only.
import type { CSSProperties } from "react";

/** PaperSeal mark: an optical aperture ring with degree ticks and a seal check. */
export function PaperSealMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  const ticks = Array.from({ length: 24 }, (_, i) => i);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <circle cx="32" cy="32" r="29" fill="#161a22" stroke="#343c4a" strokeWidth="2" />
      {ticks.map((i) => {
        const a = (i / 24) * Math.PI * 2;
        const r1 = i % 6 === 0 ? 21 : 24;
        return (
          <line key={i} x1={32 + Math.cos(a) * r1} y1={32 + Math.sin(a) * r1} x2={32 + Math.cos(a) * 27} y2={32 + Math.sin(a) * 27} stroke={i % 6 === 0 ? "#f59e0b" : "#5d6675"} strokeWidth="1.6" />
        );
      })}
      <circle cx="32" cy="32" r="13" fill="#0d0f13" stroke="#f59e0b" strokeWidth="2.4" />
      <path d="M26.5 32.5l4 4 7-8" fill="none" stroke="#eef1f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Circular verdict stamp (used on the certificate pass). */
export function StatusStamp({ tone, size = 76, className = "", style }: { tone: "ok" | "warn" | "bad" | "neutral"; size?: number; className?: string; style?: CSSProperties }) {
  const color = tone === "ok" ? "#10b981" : tone === "bad" ? "#ef4444" : tone === "warn" ? "#f59e0b" : "#8f98a8";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className} style={style}>
      <circle cx="32" cy="32" r="29" fill="none" stroke={color} strokeWidth="2" />
      <circle cx="32" cy="32" r="24" fill="none" stroke={color} strokeWidth="1" strokeDasharray="2 3" />
      <circle cx="32" cy="32" r="17" fill={color} fillOpacity="0.14" stroke={color} strokeWidth="1.6" />
      {tone === "bad" ? (
        <path d="M26 26l12 12M38 26l-12 12" stroke={color} strokeWidth="3" strokeLinecap="round" />
      ) : tone === "neutral" ? (
        <circle cx="32" cy="32" r="4" fill={color} />
      ) : (
        <path d="M25.5 32.5l4.5 4.5 8.5-9" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}
