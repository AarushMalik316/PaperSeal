import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { sha256, toUtf8Bytes } from "ethers";
import { Ban, FilePlus2, FileSignature, ShieldAlert, Send, Search, SearchCheck } from "lucide-react";
import { useApp } from "../state/AppContext";
import { useTransaction } from "../state/useTransaction";
import { NETWORK_LABEL, SAMPLE_CERT_ID, SAMPLE_CREDENTIAL } from "../lib/config";
import { fetchCertificate, getRegistry, type VersionRecord } from "../lib/registry";
import { decodeError, type DecodedError } from "../lib/errors";
import { formatUtc } from "../lib/format";
import { certIdHash, isValidCertId, normalizeCertId } from "../../shared/canonical.js";
import { ModeBanner } from "../components/ModeBanner";
import { WalletPanel } from "../components/WalletPanel";
import { FingerprintInput, type FingerprintValue } from "../components/FileDropzone";
import { TxStatus } from "../components/TxStatus";
import { Button, Chip, Field, HashBlock, SectionIntro, Spinner } from "../components/ui";

const byteLength = (s: string) => new TextEncoder().encode(s).length;

function noteError(value: string, what: string): string | null {
  const n = byteLength(value.trim());
  if (n === 0) return `Enter a ${what}.`;
  if (n > 64) return `Keep the ${what} to 64 bytes or fewer (currently ${n}).`;
  return null;
}

function certIdError(value: string): string | null {
  return isValidCertId(value) ? null : "Use 3–64 characters: letters, numbers, dot, dash or underscore. Never a person's name or student ID.";
}

function FormCard({ id, icon, dot, title, children, intro }: { id: string; icon: ReactNode; dot: string; title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <section className="paper p-6 sm:p-8" aria-labelledby={id}>
      <div className="flex items-center gap-3">
        <span className={`grid h-11 w-11 place-items-center rounded-full border border-edge ${dot}`} aria-hidden="true">
          {icon}
        </span>
        <h2 id={id} className="heading-card">
          {title}
        </h2>
      </div>
      <div className="mt-3 text-[15px] text-ink/80">{intro}</div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function IssuerDesk() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
      <ModeBanner />
      <div className="mt-10">
        <SectionIntro eyebrow="Authorized Issuer" title="Issue and correct certificates." dot="bg-go">
          Write certificate fingerprints from an authorized wallet. The contract checks your permission on every write. Use synthetic data only — never real names, student IDs or grades.
        </SectionIntro>
      </div>
      <div className="mt-10">
        <WalletPanel role="issuer" />
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <IssueForm />
        <CorrectionForm />
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <UnauthorizedDemo />
        <RevokeForm />
      </div>
    </div>
  );
}

function NotAuthorizedHint() {
  const { roles, wallet, health } = useApp();
  if (health.status !== "ok" || !wallet.account || roles.loading || roles.isIssuer) return null;
  return (
    <p className="mb-4 flex items-start gap-2 rounded-[8px] bg-alu px-3 py-2 text-[14px]">
      <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      This wallet is not an authorized issuer, so the contract will reject this action. The button stays enabled on purpose — the refusal comes from the chain, not the page.
    </p>
  );
}

function IssueForm() {
  const { wallet, connectWallet, navigate } = useApp();
  const tx = useTransaction();
  const [certId, setCertId] = useState(SAMPLE_CERT_ID);
  const [label, setLabel] = useState(SAMPLE_CREDENTIAL);
  const [fp, setFp] = useState<FingerprintValue | null>(null);
  const [touched, setTouched] = useState(false);

  const idErr = certIdError(certId);
  const labelErr = noteError(label, "credential label");
  const fpErr = fp ? null : "Hash the certificate file or paste its SHA-256.";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!wallet.account) return void connectWallet();
    if (idErr || labelErr || fpErr || !fp) return;
    const id = normalizeCertId(certId);
    const args = [certIdHash(id), fp.hash, label.trim()] as const;
    await tx.run({
      meta: { action: "Issue certificate (v1)", certId: id },
      preflight: (r) => r.issueCertificate.staticCall(...args),
      send: (r) => r.issueCertificate(...args),
    });
  };

  return (
    <FormCard
      id="issue-h"
      icon={<FilePlus2 size={19} />}
      dot="bg-go"
      title="Issue synthetic certificate"
      intro={<>Registers version 1. The contract refuses a second v1 for the same ID (<span className="font-mono text-[13px]">CertificateAlreadyExists</span>).</>}
    >
      <NotAuthorizedHint />
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Certificate ID" htmlFor="issue-id" error={touched ? idErr : null} hint="Stored on-chain only as keccak256(ID).">
          <input id="issue-id" className="field font-mono" value={certId} onChange={(e) => setCertId(e.target.value)} aria-invalid={touched && Boolean(idErr)} spellCheck={false} />
        </Field>
        <Field label="Credential label (non-personal)" htmlFor="issue-label" error={touched ? labelErr : null} hint="Public and permanent. Max 64 bytes. e.g. a programme name — never a person.">
          <input id="issue-label" className="field" value={label} onChange={(e) => setLabel(e.target.value)} aria-invalid={touched && Boolean(labelErr)} />
        </Field>
        <FingerprintInput id="issue-fp" value={fp} onChange={setFp} />
        {touched && fpErr && <p className="text-sm">{fpErr}</p>}
        <div>
          <Button type="submit" dot="go" icon={<Send size={15} />} disabled={tx.state.phase === "preflight" || tx.state.phase === "awaiting-signature" || tx.state.phase === "pending"}>
            {wallet.account ? "Issue certificate (v1)" : "Connect wallet to issue"}
          </Button>
        </div>
      </form>
      <TxStatus state={tx.state} onDismiss={tx.reset} />
      {tx.state.phase === "confirmed" && (
        <button type="button" className="mt-3 text-[14px] font-semibold underline decoration-amber decoration-2 underline-offset-4" onClick={() => navigate("verify", { cert: tx.state.phase === "confirmed" ? tx.state.meta.certId : undefined })}>
          Open in Public Verifier →
        </button>
      )}
    </FormCard>
  );
}

function useCurrentRecord() {
  const { config } = useApp();
  const [state, setState] = useState<{ kind: "idle" } | { kind: "loading" } | { kind: "found"; latest: VersionRecord; count: number } | { kind: "missing" } | { kind: "error"; message: string }>({ kind: "idle" });
  const load = async (certId: string) => {
    if (!config.address || !isValidCertId(certId)) return;
    setState({ kind: "loading" });
    try {
      const res = await fetchCertificate(config.address, certId);
      const latest = res.history[res.history.length - 1];
      setState(latest ? { kind: "found", latest, count: res.history.length } : { kind: "missing" });
    } catch (e) {
      setState({ kind: "error", message: decodeError(e).message });
    }
  };
  return { state, load };
}

function CorrectionForm() {
  const { wallet, connectWallet, navigate } = useApp();
  const tx = useTransaction();
  const current = useCurrentRecord();
  const [certId, setCertId] = useState(SAMPLE_CERT_ID);
  const [reason, setReason] = useState("AWARD-DATE-CORRECTED");
  const [fp, setFp] = useState<FingerprintValue | null>(null);
  const [touched, setTouched] = useState(false);

  const idErr = certIdError(certId);
  const reasonErr = noteError(reason, "correction note");
  const fpErr = fp ? null : "Hash the corrected file or paste its SHA-256.";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!wallet.account) return void connectWallet();
    if (idErr || reasonErr || fpErr || !fp) return;
    const id = normalizeCertId(certId);
    const args = [certIdHash(id), fp.hash, reason.trim()] as const;
    const result = await tx.run({
      meta: { action: "Append correction", certId: id },
      preflight: (r) => r.correctCertificate.staticCall(...args),
      send: (r) => r.correctCertificate(...args),
    });
    if (result.phase === "confirmed") void current.load(id);
  };

  return (
    <FormCard
      id="correct-h"
      icon={<FileSignature size={19} />}
      dot="bg-steel"
      title="Append correction / new version"
      intro={<>Adds version n + 1 as Current and marks the previous version Superseded. <strong>Earlier versions are preserved permanently</strong> — nothing is overwritten.</>}
    >
      <NotAuthorizedHint />
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Existing certificate ID" htmlFor="correct-id" error={touched ? idErr : null}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input id="correct-id" className="field font-mono sm:flex-1" value={certId} onChange={(e) => setCertId(e.target.value)} aria-invalid={touched && Boolean(idErr)} spellCheck={false} />
            <Button size="sm" icon={<Search size={13} />} onClick={() => void current.load(certId)}>
              Load current
            </Button>
          </div>
        </Field>
        <div aria-live="polite">
          {current.state.kind === "loading" && <Spinner label="Reading current version…" />}
          {current.state.kind === "missing" && <p className="text-sm">No certificate with this ID yet — the contract would reject a correction (CertificateNotFound).</p>}
          {current.state.kind === "error" && <p className="text-sm">{current.state.message}</p>}
          {current.state.kind === "found" && (
            <div className="inset px-3 py-2 text-[14px]">
              <p className="font-semibold">
                Current: v{current.state.latest.version} · {current.state.latest.status} · {formatUtc(current.state.latest.issuedAt)}
              </p>
              <p className="mono">{current.state.latest.documentHash}</p>
              <p className="mt-1">Your correction will become v{current.state.count + 1}.</p>
            </div>
          )}
        </div>
        <FingerprintInput id="correct-fp" value={fp} onChange={setFp} />
        {touched && fpErr && <p className="text-sm">{fpErr}</p>}
        <Field label="Correction note (non-personal)" htmlFor="correct-reason" error={touched ? reasonErr : null} hint="Short public code, max 64 bytes, e.g. AWARD-DATE-CORRECTED.">
          <input id="correct-reason" className="field" value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={touched && Boolean(reasonErr)} />
        </Field>
        <div>
          <Button type="submit" dot="steel" icon={<Send size={15} />} disabled={tx.state.phase === "preflight" || tx.state.phase === "awaiting-signature" || tx.state.phase === "pending"}>
            {wallet.account ? "Append correction" : "Connect wallet to correct"}
          </Button>
        </div>
      </form>
      <TxStatus state={tx.state} onDismiss={tx.reset} />
      {tx.state.phase === "confirmed" && (
        <button type="button" className="mt-3 text-[14px] font-semibold underline decoration-amber decoration-2 underline-offset-4" onClick={() => navigate("verify", { cert: tx.state.phase === "confirmed" ? tx.state.meta.certId : undefined })}>
          See the full history in Public Verifier →
        </button>
      )}
    </FormCard>
  );
}

function RevokeForm() {
  const { wallet, connectWallet } = useApp();
  const tx = useTransaction();
  const [certId, setCertId] = useState("");
  const [reason, setReason] = useState("ISSUED-IN-ERROR");
  const [touched, setTouched] = useState(false);
  const idErr = certIdError(certId);
  const reasonErr = noteError(reason, "revocation code");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!wallet.account) return void connectWallet();
    if (idErr || reasonErr) return;
    const id = normalizeCertId(certId);
    const args = [certIdHash(id), reason.trim()] as const;
    await tx.run({
      meta: { action: "Revoke certificate", certId: id },
      preflight: (r) => r.revokeCertificate.staticCall(...args),
      send: (r) => r.revokeCertificate(...args),
    });
  };

  return (
    <FormCard id="revoke-h" icon={<Ban size={19} />} dot="bg-alu" title="Revoke" intro="Appends a final Revoked version. A revoked certificate can never be corrected again (CertificateIsRevoked).">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Certificate ID" htmlFor="revoke-id" error={touched ? idErr : null}>
          <input id="revoke-id" className="field font-mono" value={certId} placeholder="CERT-2026-SYN-002" onChange={(e) => setCertId(e.target.value)} aria-invalid={touched && Boolean(idErr)} spellCheck={false} />
        </Field>
        <Field label="Revocation code" htmlFor="revoke-reason" error={touched ? reasonErr : null}>
          <input id="revoke-reason" className="field" value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={touched && Boolean(reasonErr)} />
        </Field>
        <div>
          <Button type="submit" icon={<Ban size={15} />} disabled={tx.state.phase === "preflight" || tx.state.phase === "awaiting-signature" || tx.state.phase === "pending"}>
            {wallet.account ? "Revoke certificate" : "Connect wallet"}
          </Button>
        </div>
      </form>
      <TxStatus state={tx.state} onDismiss={tx.reset} />
    </FormCard>
  );
}

type SimResult = { kind: "idle" } | { kind: "running" } | { kind: "rejected"; error: DecodedError } | { kind: "allowed" } | { kind: "error"; error: DecodedError };

function UnauthorizedDemo() {
  const { wallet, connectWallet, config, roles, health } = useApp();
  const tx = useTransaction();
  const [action, setAction] = useState<"issue" | "correct">("issue");
  const [sim, setSim] = useState<SimResult>({ kind: "idle" });
  const demoHash = useMemo(() => sha256(toUtf8Bytes("PaperSeal unauthorized-wallet demonstration (synthetic)")), []);
  const certId = action === "issue" ? "CERT-2026-SYN-FORGED" : SAMPLE_CERT_ID;
  const args = action === "issue" ? ([certIdHash(certId), demoHash, "FORGED-ATTEMPT"] as const) : ([certIdHash(certId), demoHash, "FORGED-CORRECTION"] as const);
  const fn = action === "issue" ? "issueCertificate" : "correctCertificate";

  const attempt = async () => {
    tx.reset();
    if (!wallet.account) return void connectWallet();
    if (!config.address) {
      setSim({ kind: "error", error: { kind: "unknown", title: "Contract not configured", message: "Set VITE_CONTRACT_ADDRESS first (see Setup)." } });
      return;
    }
    setSim({ kind: "running" });
    try {
      // Real eth_call against the deployed contract, sent "from" the connected wallet.
      await getRegistry(config.address)[fn].staticCall(...args, { from: wallet.account });
      setSim({ kind: "allowed" });
    } catch (e) {
      const d = decodeError(e);
      setSim(d.kind === "contract-revert" ? { kind: "rejected", error: d } : { kind: "error", error: d });
    }
  };

  const broadcast = async () => {
    await tx.run({
      meta: { action: action === "issue" ? "Unauthorized issue attempt" : "Unauthorized correction attempt", certId },
      preflight: (r) => r[fn].staticCall(...args),
      send: (r) => r[fn](...args, { gasLimit: 160_000n }),
      broadcastEvenIfPreflightFails: true,
    });
  };

  return (
    <section className="paper layered p-6 sm:p-8" aria-labelledby="unauth-h">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full border border-edge bg-stop" aria-hidden="true">
          <ShieldAlert size={19} />
        </span>
        <h2 id="unauth-h" className="heading-card">
          Unauthorized-action demonstration
        </h2>
      </div>
      <p className="mt-3 text-[15px] text-ink/80">
        Switch MetaMask to a wallet the admin has <strong>not</strong> authorized, then attempt a write. The button is never disabled: the live CertificateRegistry on {NETWORK_LABEL} refuses
        the call itself with <span className="font-mono text-[13px]">NotAuthorizedIssuer(address)</span>.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {health.status === "ok" && wallet.account ? (
          roles.isIssuer ? (
            <Chip tone="warn">Connected wallet IS authorized — switch accounts to see a rejection</Chip>
          ) : (
            <Chip tone="ok">Connected wallet is unauthorized — ready to demonstrate</Chip>
          )
        ) : (
          <Chip tone="neutral">{wallet.account ? "Contract not reachable yet" : "Connect a wallet to attempt"}</Chip>
        )}
      </div>

      <fieldset className="mt-5">
        <legend className="mb-2 text-[15px] font-semibold">Attempt</legend>
        <div className="flex flex-wrap gap-2">
          {(["issue", "correct"] as const).map((a) => (
            <label key={a} className={`inline-flex cursor-pointer items-center gap-2 rounded-[10px] border px-3 py-2 text-[14px] font-medium ${action === a ? "border-edge bg-obsidian" : "border-line bg-panel"}`}>
              <input
                type="radio"
                name="unauth-action"
                value={a}
                checked={action === a}
                onChange={() => {
                  setAction(a);
                  setSim({ kind: "idle" });
                  tx.reset();
                }}
                className="accent-[#f59e0b]"
              />
              {a === "issue" ? "issueCertificate (new ID)" : `correctCertificate (${SAMPLE_CERT_ID})`}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-3 grid gap-2">
        <HashBlock label="Certificate ID → certIdHash" value={`${certId} → ${args[0]}`} copy={false} />
        <HashBlock label="Synthetic document fingerprint" value={demoHash} copy={false} />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button dot="stop" icon={<SearchCheck size={15} />} onClick={attempt} disabled={sim.kind === "running"}>
          {wallet.account ? `Attempt ${fn} with connected wallet` : "Connect wallet to attempt"}
        </Button>
      </div>

      <div className="mt-4" aria-live="polite">
        {sim.kind === "running" && <Spinner label="Calling the live contract (eth_call)…" />}
        {sim.kind === "rejected" && (
          <div className="rounded-[8px] border border-edge bg-panel p-4" role="alert">
            <p className="font-semibold">Failed / Reverted · {sim.error.title}</p>
            <p className="mt-1 text-[15px] text-ink/80">{sim.error.message}</p>
            {sim.error.signature && (
              <div className="mt-2">
                <HashBlock label="Revert data decoded from the contract" value={sim.error.signature} />
              </div>
            )}
            <p className="mt-2 text-[13px] text-muted">
              Source: eth_call to {config.address} on {NETWORK_LABEL} with from = your wallet. No gas spent, nothing written.
            </p>
            <div className="mt-3 border-t border-line pt-3">
              <p className="text-[14px]">
                Want a reverted transaction hash on BaseScan too? Broadcast it with a manual gas limit. MetaMask may warn it will fail — that's the point. It costs a little test ETH.
              </p>
              <div className="mt-2">
                <Button size="sm" icon={<Send size={13} />} onClick={broadcast} disabled={tx.state.phase === "awaiting-signature" || tx.state.phase === "pending"}>
                  Broadcast anyway (manual gas)
                </Button>
              </div>
            </div>
          </div>
        )}
        {sim.kind === "allowed" && (
          <div className="rounded-[8px] border border-edge bg-panel p-4">
            <p className="font-semibold">Not rejected — this wallet is authorized</p>
            <p className="text-[15px] text-ink/80">
              The simulation succeeded, so nothing was sent. Switch MetaMask to an unauthorized account (or have the admin deauthorize this one) and try again.
            </p>
          </div>
        )}
        {sim.kind === "error" && (
          <div className="rounded-[8px] border border-edge bg-panel p-4" role="alert">
            <p className="font-semibold">{sim.error.title}</p>
            <p className="text-[15px] text-ink/80">{sim.error.message}</p>
          </div>
        )}
        <TxStatus state={tx.state} onDismiss={tx.reset} />
      </div>
    </section>
  );
}
