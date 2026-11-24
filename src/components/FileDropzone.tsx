import { useId, useRef, useState, type DragEvent } from "react";
import { FileUp, ShieldCheck } from "lucide-react";
import { hashFile, formatBytes, normalizeBytes32 } from "../lib/hash";
import { Spinner } from "./ui";

/** Accessible file picker + drop target. The file is only read locally. */
export function FileDropzone({ onFile, label = "Choose or drop a certificate file", busy = false }: { onFile: (file: File) => void; label?: string; busy?: boolean }) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[8px] border-2 border-dashed px-4 py-6 text-center transition-colors focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-steel ${
        dragging ? "border-edge bg-obsidian" : "border-muted bg-alu"
      }`}
    >
      <span className="grid h-11 w-11 place-items-center rounded-full border border-edge bg-panel" aria-hidden="true">
        {busy ? <Spinner /> : <FileUp size={20} />}
      </span>
      <span className="font-semibold">{label}</span>
      <span className="flex items-center gap-1.5 text-sm text-ink/75">
        <ShieldCheck size={14} aria-hidden="true" /> Hashed in your browser with Web Crypto. Never uploaded or stored.
      </span>
      <input
        ref={inputRef}
        id={id}
        type="file"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}

export interface FingerprintValue {
  hash: string;
  source: "file" | "manual";
  fileName?: string;
  size?: number;
}

/** Issuer input: hash a local file, or paste a 32-byte SHA-256 hex. */
export function FingerprintInput({ id, value, onChange }: { id: string; value: FingerprintValue | null; onChange: (v: FingerprintValue | null) => void }) {
  const [mode, setMode] = useState<"file" | "manual">("file");
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const hash = await hashFile(file);
      onChange({ hash, source: "file", fileName: file.name, size: file.size });
    } catch {
      setError("Could not read that file in this browser.");
      onChange(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span id={`${id}-label`} className="text-[15px] font-semibold">
          Document SHA-256 fingerprint
        </span>
        <div role="tablist" aria-label="Fingerprint source" className="inline-flex rounded-[10px] border border-edge bg-panel p-0.5 text-[13px] font-semibold">
          {(["file", "manual"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setError(null);
                onChange(null);
              }}
              className={`rounded-[8px] px-2.5 py-1 ${mode === m ? "bg-amber text-obsidian" : "hover:bg-obsidian"}`}
            >
              {m === "file" ? "Hash a file" : "Paste hex"}
            </button>
          ))}
        </div>
      </div>
      {mode === "file" ? (
        <FileDropzone onFile={handleFile} busy={busy} label="Choose or drop the certificate file" />
      ) : (
        <input
          id={id}
          className="field mono"
          placeholder="0x… (64 hex characters)"
          value={manual}
          aria-labelledby={`${id}-label`}
          aria-invalid={Boolean(manual) && !normalizeBytes32(manual)}
          onChange={(e) => {
            setManual(e.target.value);
            const norm = normalizeBytes32(e.target.value);
            onChange(norm ? { hash: norm, source: "manual" } : null);
            setError(e.target.value && !norm ? "Enter exactly 32 bytes as hex (64 characters, optional 0x)." : null);
          }}
        />
      )}
      {error && <p className="text-sm">{error}</p>}
      {value && (
        <div className="inset px-3 py-2">
          <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted">
            {value.source === "file" ? `SHA-256 of ${value.fileName} (${formatBytes(value.size ?? 0)})` : "Pasted fingerprint"}
          </p>
          <p className="mono">{value.hash}</p>
        </div>
      )}
    </div>
  );
}
