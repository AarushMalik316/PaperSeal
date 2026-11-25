import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Download, FileCheck2, FileX2, History, Search, ShieldAlert, XCircle, AlertTriangle, CircleHelp, Receipt } from "lucide-react";
import { useApp } from "../state/AppContext";
import { NETWORK_LABEL, SAMPLE_CERT_ID, SAMPLE_FILES, addressUrl, blockUrl } from "../lib/config";
import { fetchCertificate, findVersionTx, type CertificateLookup, type VersionRecord } from "../lib/registry";
import { deriveVerdict, matchFile, type FileCheck, type LookupState, type Verdict } from "../lib/verdict";
import { hashFile, formatBytes } from "../lib/hash";
import { formatUtc } from "../lib/format";
import { decodeError } from "../lib/errors";
import { isValidCertId, normalizeCertId } from "../../shared/canonical.js";
import { ModeBanner } from "../components/ModeBanner";
import { FileDropzone } from "../components/FileDropzone";
import { HangingPass } from "../components/pass/HangingPass";
import { livePass } from "../components/pass/types";
import { ProofReceipt } from "../components/ProofReceipt";
import { Chip, ExternalLink, HashBlock, Row, SectionIntro, Spinner } from "../components/ui";

const VERDICT_STYLE: Record<Verdict["tone"], { bg: string; icon: JSX.Element }> = {
  ok: { bg: "bg-go", icon: <CheckCircle2 size={26} aria-hidden="true" /> },
  warn: { bg: "bg-amber", icon: <AlertTriangle size={26} aria-hidden="true" /> },
  bad: { bg: "bg-stop", icon: <XCircle size={26} aria-hidden="true" /> },
  neutral: { bg: "bg-alu", icon: <CircleHelp size={26} aria-hidden="true" /> },
};

export function Verifier() {
  const { config, health, certParam, setActivePass, navigate } = useApp();
  const [input, setInput] = useState(certParam || "");
  const [inputError, setInputError] = useState<string | null>(null);
  const [lookup, setLookup] = useState<LookupState>({ kind: "idle" });
  const [file, setFile] = useState<FileCheck>({ kind: "none" });
  const seq = useRef(0);

  const runLookup = useCallback(
    async (raw: string) => {
      const certId = normalizeCertId(raw);
      const id = ++seq.current;
      if (!config.address) {
        setLookup({ kind: "unconfigured", certId });
        return;
      }
      setLookup({ kind: "loading", certId });
      try {
        const result = await fetchCertificate(config.address, certId);
        if (id !== seq.current) return;
        setLookup({ kind: "found", lookup: result });
        const pass = livePass(result, config.address);
        if (pass) {
          setActivePass(pass);
          const latest = result.history[result.history.length - 1];
          findVersionTx(config.address, result.certIdHash, latest)
            .then((ev) => {
              if (ev && id === seq.current) setActivePass(livePass(result, config.address!, ev.txHash));
            })
            .catch(() => undefined);
        }
      } catch (e) {
        if (id !== seq.current) return;
        const decoded = decodeError(e);
        setLookup({ kind: "rpc-error", certId, message: decoded.raw ?? decoded.message });
      }
    },
    [config.address, setActivePass],
  );

  // Deep link: ?cert=… (e.g. scanned from the pass QR code).
  useEffect(() => {
    if (certParam) {
      setInput(certParam);
      if (isValidCertId(certParam)) void runLookup(certParam);
    }
  }, [certParam, runLookup]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValidCertId(input)) {
      setInputError("Use 3–64 characters: letters, numbers, dot, dash or underscore (e.g. CERT-2026-SYN-001).");
      return;
    }
    setInputError(null);
    const id = normalizeCertId(input);
    navigate("verify", { cert: id });
    if (id === certParam) void runLookup(id);
  };

  const onFile = async (f: File) => {
    setFile({ kind: "hashing", fileName: f.name });
    try {
      const hash = await hashFile(f);
      setFile({ kind: "hashed", fileName: f.name, size: f.size, hash });
    } catch {
      setFile({ kind: "error", message: "This browser could not read the file." });
    }
  };

  const verdict = deriveVerdict(health.status === "no-code" || health.status === "chain-mismatch" ? (lookup.kind === "idle" ? lookup : { kind: "unconfigured", certId: "" }) : lookup, file);
  const found = lookup.kind === "found" && lookup.lookup.history.length > 0 ? lookup.lookup : null;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
      <ModeBanner />
      <div className="mt-10">
        <SectionIntro eyebrow="Public Verifier · No wallet needed" title="Check a certificate." dot="bg-steel">
          Enter a certificate ID to read its record straight from CertificateRegistry on {NETWORK_LABEL}. Then drop the document file to confirm it matches,
          byte for byte — locally, in your browser.
        </SectionIntro>
      </div>

      <form onSubmit={onSubmit} className="mt-10 flex max-w-3xl flex-col gap-2" role="search" aria-label="Certificate lookup">
        <label htmlFor="cert-id" className="text-[15px] font-semibold">
          Certificate ID
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="cert-id"
            className="field font-mono sm:flex-1"
            placeholder={SAMPLE_CERT_ID}
            value={input}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(inputError)}
            aria-describedby="cert-id-help"
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="btn btn-accent justify-center" disabled={lookup.kind === "loading"}>
            <span className="btn-dot bg-panel" aria-hidden="true">
              <Search size={15} />
            </span>
            {lookup.kind === "loading" ? "Checking…" : "Verify certificate"}
          </button>
        </div>
        <p id="cert-id-help" className="text-sm text-muted">
          {inputError ?? "IDs are trimmed and upper-cased, then hashed with keccak256 — the plain ID never goes on-chain."}
        </p>
        <button
          type="button"
          className="self-start text-sm font-semibold underline decoration-amber decoration-2 underline-offset-4"
          onClick={() => {
            setInput(SAMPLE_CERT_ID);
            setInputError(null);
          }}
        >
          Use sample ID {SAMPLE_CERT_ID}
        </button>
      </form>

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          {lookup.kind === "loading" && (
            <div className="paper p-6">
              <Spinner label={`Reading ${lookup.certId} from the contract…`} />
            </div>
          )}
          {verdict && (
            <VerdictCard
              verdict={verdict}
              certId={lookup.kind === "found" ? lookup.lookup.certId : "certId" in lookup ? lookup.certId : ""}
              contractAddress={config.address}
            />
          )}
          {found && <RecordDetails lookup={found} contract={config.address!} />}

          <TamperCheck file={file} onFile={onFile} history={found?.history ?? null} />

          {found && <HistoryTimeline lookup={found} contract={config.address!} />}
        </div>

        <aside className="min-w-0" aria-label="Certificate pass">
          <div className="lg:sticky lg:top-24">
            {found ? (
              <HangingPass pass={livePass(found, config.address!)!} strapHeight={60} caption={<Chip tone="ok">Live from contract</Chip>} />
            ) : (
              <div className="paper-soft flex flex-col items-center gap-3 p-8 text-center">
                <FileCheck2 size={28} aria-hidden="true" />
                <p className="text-[16px] font-semibold">The certificate pass appears here after a successful lookup.</p>
                <p className="text-[14px] text-ink/70">Every field on it is read from the contract — nothing is filled in by the app.</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function VerdictCard({ verdict, certId, contractAddress }: { verdict: Verdict; certId: string; contractAddress: string | null }) {
  const style = VERDICT_STYLE[verdict.tone];
  return (
    <section className="paper layered p-6 sm:p-8" aria-live="polite" aria-labelledby="verdict-h">
      <div className="flex items-start gap-4">
        <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full border border-edge ${style.bg}`}>{style.icon}</span>
        <div className="min-w-0">
          <p className="eyebrow text-ink/70">Verification result{certId ? ` · ${certId}` : ""}</p>
          <h2 id="verdict-h" className="heading-card mt-1">
            {verdict.label}
          </h2>
          <p className="mt-2 text-[16px] text-ink/85">{verdict.detail}</p>
          {verdict.code === "not-found" && contractAddress && (
            <p className="mt-2 font-mono text-[12px] text-muted">
              Checked contract {contractAddress} on {NETWORK_LABEL}.
            </p>
          )}
          {verdict.fileMatch && (
            <p className="mt-3">
              {verdict.fileMatch.kind === "match" ? (
                <Chip tone={verdict.fileMatch.isLatest ? "ok" : "warn"} icon={<FileCheck2 size={12} />}>
                  Fingerprint Match · v{verdict.fileMatch.version}
                  {verdict.fileMatch.isLatest ? " (current)" : " (superseded)"}
                </Chip>
              ) : (
                <Chip tone="bad" icon={<FileX2 size={12} />}>
                  Fingerprint Mismatch
                </Chip>
              )}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function RecordDetails({ lookup, contract }: { lookup: CertificateLookup; contract: string }) {
  const latest = lookup.history[lookup.history.length - 1];
  const first = lookup.history[0];
  return (
    <section className="paper p-6 sm:p-8" aria-labelledby="record-h">
      <h2 id="record-h" className="heading-card">
        On-chain record
      </h2>
      <dl className="mt-4">
        <Row label="Credential">{first.note}</Row>
        <Row label="Current version">
          v{latest.version} · {latest.status}
        </Row>
        <Row label="Issuer wallet">
          <span className="mono">{latest.issuer}</span>{" "}
          {addressUrl(latest.issuer) && <ExternalLink href={addressUrl(latest.issuer)!} compact>BaseScan</ExternalLink>}
        </Row>
        <Row label="First issued">{formatUtc(first.issuedAt)}</Row>
        <Row label="Last updated">{formatUtc(latest.issuedAt)}</Row>
        <Row label="Versions">{lookup.history.length}</Row>
      </dl>
      <div className="mt-4 grid gap-2">
        <HashBlock label="Current document SHA-256" value={latest.documentHash} />
        <HashBlock label="certIdHash = keccak256(ID)" value={lookup.certIdHash} />
        <HashBlock label="CertificateRegistry.sol" value={contract} href={addressUrl(contract)} />
      </div>
    </section>
  );
}

function TamperCheck({ file, onFile, history }: { file: FileCheck; onFile: (f: File) => void; history: VersionRecord[] | null }) {
  const match = file.kind === "hashed" && history ? matchFile(history, file.hash) : null;
  return (
    <section className="paper p-6 sm:p-8" aria-labelledby="tamper-h">
      <p className="eyebrow mb-2 flex items-center gap-2 text-ink/70">
        <ShieldAlert size={14} aria-hidden="true" /> Privacy-first · runs only in this browser
      </p>
      <h2 id="tamper-h" className="heading-card">
        Local tamper check
      </h2>
      <p className="mt-2 text-[15px] text-ink/80">
        Your file is read into memory and hashed with <span className="font-mono text-[13px]">crypto.subtle.digest("SHA-256")</span>. It is never uploaded, stored or logged.
      </p>
      <div className="mt-4">
        <FileDropzone onFile={onFile} busy={file.kind === "hashing"} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">Synthetic samples:</span>
        {SAMPLE_FILES.map((f) => (
          <a key={f.key} href={f.path} download className="inline-flex items-center gap-1 rounded-[10px] border border-edge bg-panel px-2 py-1 text-xs font-semibold hover:bg-obsidian">
            <Download size={12} aria-hidden="true" /> {f.label}
          </a>
        ))}
      </div>

      <div className="mt-4" aria-live="polite">
        {file.kind === "error" && <p>{file.message}</p>}
        {file.kind === "hashed" && (
          <div className="flex flex-col gap-3">
            <HashBlock label={`SHA-256 of ${file.fileName} (${formatBytes(file.size)})`} value={file.hash} />
            {!history ? (
              <p className="text-[15px] text-ink/80">Look up a certificate above to compare this fingerprint with the on-chain record.</p>
            ) : match?.kind === "match" ? (
              <div className="flex items-start gap-3 rounded-[8px] border border-edge p-4">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border border-edge ${match.isLatest ? "bg-go" : "bg-amber"}`} aria-hidden="true">
                  <FileCheck2 size={17} />
                </span>
                <div>
                  <p className="font-semibold">Fingerprint Match — version {match.version}{match.isLatest ? " (current)" : " (superseded by a correction)"}</p>
                  <p className="text-[15px] text-ink/80">These exact bytes were recorded on-chain by the issuer.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-[8px] border border-edge p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-edge bg-stop" aria-hidden="true">
                  <FileX2 size={17} />
                </span>
                <div>
                  <p className="font-semibold">Fingerprint Mismatch</p>
                  <p className="text-[15px] text-ink/80">This file's fingerprint matches no version of this certificate. It was altered, re-exported, or is a different document.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="mt-4 rounded-[8px] bg-alu px-3 py-2 text-[14px]">
        A match proves the file is byte-for-byte identical to what the issuer fingerprinted on-chain. It does not independently prove the real-world facts inside it. Editing,
        re-saving or re-exporting a file (even to the same format) changes its fingerprint.
      </p>
    </section>
  );
}

function HistoryTimeline({ lookup, contract }: { lookup: CertificateLookup; contract: string }) {
  return (
    <section className="paper p-6 sm:p-8" aria-labelledby="history-h">
      <h2 id="history-h" className="heading-card flex items-center gap-2">
        <History size={22} aria-hidden="true" /> Correction history
      </h2>
      <p className="mt-2 text-[15px] text-ink/80">Append-only: every version ever written stays here. Corrections add versions; nothing is edited or deleted.</p>
      <ol className="mt-5 flex flex-col gap-4">
        {[...lookup.history].reverse().map((v) => (
          <HistoryItem key={v.version} record={v} lookup={lookup} contract={contract} />
        ))}
      </ol>
    </section>
  );
}

type ReceiptState = { kind: "idle" } | { kind: "loading" } | { kind: "found"; txHash: string } | { kind: "missing" } | { kind: "error"; message: string };

function HistoryItem({ record, lookup, contract }: { record: VersionRecord; lookup: CertificateLookup; contract: string }) {
  const [receipt, setReceipt] = useState<ReceiptState>({ kind: "idle" });
  const tone = record.status === "Current" ? "ok" : record.status === "Revoked" ? "bad" : "warn";
  const action = record.version === 1 ? "Issue certificate" : record.status === "Revoked" ? "Revoke certificate" : "Append correction";

  const load = async () => {
    if (receipt.kind === "found") {
      setReceipt({ kind: "idle" });
      return;
    }
    setReceipt({ kind: "loading" });
    try {
      const ev = await findVersionTx(contract, lookup.certIdHash, record);
      setReceipt(ev ? { kind: "found", txHash: ev.txHash } : { kind: "missing" });
    } catch (e) {
      setReceipt({ kind: "error", message: decodeError(e).message });
    }
  };

  return (
    <li className="rounded-[8px] border border-line bg-panel p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-full border border-edge bg-amber text-[13px] font-bold">v{record.version}</span>
        <Chip tone={tone}>{record.status === "Superseded" ? "Superseded by correction" : record.status}</Chip>
        <span className="text-[14px] text-ink/75">{formatUtc(record.issuedAt)}</span>
      </div>
      <p className="mt-2 text-[15px]">
        <span className="font-semibold">{record.version === 1 ? "Credential:" : record.status === "Revoked" ? "Revocation code:" : "Correction note:"}</span> {record.note}
      </p>
      <div className="mt-3 grid gap-2">
        <HashBlock label="Document SHA-256" value={record.documentHash} />
        <HashBlock label="Issuer wallet" value={record.issuer} href={addressUrl(record.issuer)} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={load} className="btn btn-sm" aria-expanded={receipt.kind === "found"}>
          <span className="btn-dot bg-go" aria-hidden="true">
            <Receipt size={12} />
          </span>
          {receipt.kind === "found" ? "Hide proof receipt" : "Show proof receipt"}
        </button>
        <span className="text-[13px] text-muted">
          Block{" "}
          {blockUrl(record.blockNumber) ? <ExternalLink href={blockUrl(record.blockNumber)!}>{record.blockNumber}</ExternalLink> : record.blockNumber}
        </span>
      </div>
      <div className="mt-3" aria-live="polite">
        {receipt.kind === "loading" && <Spinner label="Finding the transaction in block logs…" />}
        {receipt.kind === "missing" && <p className="text-sm">No matching event log was returned for this block, so no receipt is shown.</p>}
        {receipt.kind === "error" && <p className="text-sm">Could not fetch logs: {receipt.message}</p>}
        {receipt.kind === "found" && (
          <ProofReceipt
            title={`Proof receipt · v${record.version}`}
            receipt={{
              action,
              certId: lookup.certId,
              txHash: receipt.txHash,
              from: record.issuer,
              blockNumber: record.blockNumber,
              timestamp: record.issuedAt,
              version: record.version,
              network: NETWORK_LABEL,
            }}
          />
        )}
      </div>
    </li>
  );
}
