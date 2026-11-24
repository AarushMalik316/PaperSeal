import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { AlertTriangle, Check, CircleHelp, Copy, ExternalLink as ExternalIcon, XCircle, CheckCircle2, Loader2 } from "lucide-react";

export type Tone = "ok" | "warn" | "bad" | "neutral" | "info";

const DOT_BG = {
  go: "bg-go",
  steel: "bg-steel",
  amber: "bg-amber",
  stop: "bg-stop",
  alu: "bg-[#3a4352] !text-ink",
  panel: "bg-panel !text-ink",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  dot?: keyof typeof DOT_BG;
  variant?: "default" | "accent";
  size?: "md" | "sm";
}

/** Anodized button with a small square icon accent. */
export function Button({ icon, dot = "alu", variant = "default", size = "md", className = "", children, ...rest }: ButtonProps) {
  const classes = ["btn", variant === "accent" ? "btn-accent" : "", size === "sm" ? "btn-sm" : "", icon ? "" : "btn-plain", className]
    .filter(Boolean)
    .join(" ");
  return (
    <button type="button" className={classes} {...rest}>
      {icon && (
        <span className={`btn-dot ${DOT_BG[dot]}`} aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}

const TONE_ICON: Record<Tone, ReactNode> = {
  ok: <CheckCircle2 size={15} aria-hidden="true" />,
  warn: <AlertTriangle size={15} aria-hidden="true" />,
  bad: <XCircle size={15} aria-hidden="true" />,
  neutral: <CircleHelp size={15} aria-hidden="true" />,
  info: <CircleHelp size={15} aria-hidden="true" />,
};
const TONE_DOT: Record<Tone, string> = {
  ok: "bg-go",
  warn: "bg-amber",
  bad: "bg-stop",
  neutral: "bg-[#3a4352] !text-ink",
  info: "bg-steel",
};

/** Status chip — always icon + text, never colour alone. */
export function Chip({ tone = "neutral", children, icon, className = "" }: { tone?: Tone; children: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <span className={`chip ${className}`}>
      <span className={`inline-grid h-[18px] w-[18px] place-items-center rounded-[5px] text-obsidian ${TONE_DOT[tone]}`}>{icon ?? TONE_ICON[tone]}</span>
      {children}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2" role="status">
      <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
      {label && <span>{label}</span>}
    </span>
  );
}

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex shrink-0 items-center gap-1 rounded-[10px] border border-edge bg-panel px-2 py-1 text-xs font-semibold hover:bg-obsidian"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        } catch {
          /* clipboard unavailable */
        }
      }}
      aria-label={label}
      title={value.length > 120 ? undefined : value}
    >
      {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
      {copied ? "Copied" : label}
    </button>
  );
}

/** Recessed sandstone block for hashes / addresses. */
export function HashBlock({ label, value, copy = true, href }: { label: string; value: string; copy?: boolean; href?: string | null }) {
  return (
    <div className="inset px-3 py-2.5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted">{label}</span>
        <span className="flex items-center gap-1.5">
          {href && <ExternalLink href={href} compact>BaseScan</ExternalLink>}
          {copy && value && <CopyButton value={value} />}
        </span>
      </div>
      <div className="mono text-ink">{value || "—"}</div>
    </div>
  );
}

export function ExternalLink({ href, children, compact = false }: { href: string; children: ReactNode; compact?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={
        compact
          ? "inline-flex items-center gap-1 rounded-[10px] border border-edge bg-panel px-2 py-1 text-xs font-semibold hover:bg-obsidian"
          : "inline-flex items-center gap-1 font-medium underline decoration-amber decoration-2 underline-offset-4 hover:decoration-ink"
      }
    >
      {children}
      <ExternalIcon size={compact ? 12 : 14} aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

export function Field({ label, hint, error, htmlFor, children }: { label: string; hint?: ReactNode; error?: string | null; htmlFor: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[15px] font-semibold">
        {label}
      </label>
      {children}
      {error ? (
        <p className="flex items-center gap-1.5 text-sm text-ink" id={`${htmlFor}-error`}>
          <XCircle size={14} className="text-stop" aria-hidden="true" /> {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-muted" id={`${htmlFor}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function SectionIntro({ eyebrow, title, children, dot = "bg-go" }: { eyebrow: string; title: ReactNode; children?: ReactNode; dot?: string }) {
  return (
    <header className="max-w-4xl">
      <p className="eyebrow mb-4 flex items-center gap-2">
        <span className={`inline-block h-2.5 w-2.5 rounded-full border border-edge ${dot}`} aria-hidden="true" />
        {eyebrow}
      </p>
      <h1 className="display-section">{title}</h1>
      {children && <div className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink/80">{children}</div>}
    </header>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 border-b border-line py-2.5 last:border-b-0 sm:grid-cols-[150px_1fr] sm:gap-4">
      <dt className="text-sm font-semibold text-muted">{label}</dt>
      <dd className="min-w-0 text-[15px]">{children}</dd>
    </div>
  );
}
