import { useCallback, useEffect, useState, type FormEvent } from "react";
import { isAddress, getAddress } from "ethers";
import { Activity, RefreshCw, UserCheck, UserMinus, Users } from "lucide-react";
import { useApp } from "../state/AppContext";
import { useTransaction } from "../state/useTransaction";
import { addressUrl, txUrl } from "../lib/config";
import { fetchAuthorizedIssuers, fetchRecentEvents, fetchTotalCertificates, type EventScan, type RegistryEvent } from "../lib/registry";
import { decodeError } from "../lib/errors";
import { shortHex } from "../lib/format";
import { ModeBanner } from "../components/ModeBanner";
import { WalletPanel } from "../components/WalletPanel";
import { TxStatus } from "../components/TxStatus";
import { Button, Chip, ExternalLink, Field, HashBlock, Row, SectionIntro, Spinner } from "../components/ui";

export function Admin() {
  const { config, health, roles, refreshRoles } = useApp();
  const live = health.status === "ok" && Boolean(config.address);
  const [issuers, setIssuers] = useState<{ kind: "idle" | "loading" } | { kind: "ok"; list: string[] } | { kind: "error"; message: string }>({ kind: "idle" });
  const [total, setTotal] = useState<number | null>(null);
  const [events, setEvents] = useState<{ kind: "idle" | "loading" } | { kind: "ok"; scan: EventScan } | { kind: "error"; message: string }>({ kind: "idle" });

  const loadIssuers = useCallback(async () => {
    if (!config.address) return;
    setIssuers({ kind: "loading" });
    try {
      const [list, count] = await Promise.all([fetchAuthorizedIssuers(config.address), fetchTotalCertificates(config.address)]);
      setIssuers({ kind: "ok", list });
      setTotal(count);
    } catch (e) {
      setIssuers({ kind: "error", message: decodeError(e).message });
    }
  }, [config.address]);

  const loadEvents = useCallback(async () => {
    if (!config.address) return;
    setEvents({ kind: "loading" });
    try {
      setEvents({ kind: "ok", scan: await fetchRecentEvents(config.address, config.deployBlock) });
    } catch (e) {
      setEvents({ kind: "error", message: decodeError(e).message });
    }
  }, [config.address, config.deployBlock]);

  useEffect(() => {
    if (live) {
      void loadIssuers();
      void loadEvents();
    }
  }, [live, loadIssuers, loadEvents]);

  const afterConfirm = () => {
    void loadIssuers();
    void loadEvents();
    void refreshRoles();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
      <ModeBanner />
      <div className="mt-10">
        <SectionIntro eyebrow="Institution Admin" title="Decide who may issue." dot="bg-amber">
          Only the admin wallet that deployed CertificateRegistry can authorize or remove issuer wallets. Every change is a public, timestamped contract event.
        </SectionIntro>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <WalletPanel role="admin" />
        <section className="paper p-6 sm:p-8" aria-labelledby="contract-h">
          <h2 id="contract-h" className="heading-card">
            Contract
          </h2>
          {config.address ? (
            <dl className="mt-4">
              <Row label="Address">
                <span className="mono">{config.address}</span>{" "}
                {addressUrl(config.address) && <ExternalLink href={addressUrl(config.address)!} compact>BaseScan</ExternalLink>}
              </Row>
              <Row label="admin()">{roles.admin ? <span className="mono">{roles.admin}</span> : live ? "Reading…" : "—"}</Row>
              <Row label="Certificates">{total ?? "—"}</Row>
              <Row label="Deploy block">{config.deployBlock || "Not set (VITE_DEPLOY_BLOCK)"}</Row>
            </dl>
          ) : (
            <p className="mt-3 text-[15px]">Unconfigured (.env). Open Setup to deploy or configure the contract address.</p>
          )}
        </section>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <IssuerForm onConfirmed={afterConfirm} />
        <section className="paper p-6 sm:p-8" aria-labelledby="issuers-h">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="issuers-h" className="heading-card flex items-center gap-2">
              <Users size={22} aria-hidden="true" /> Authorized issuers
            </h2>
            <Button size="sm" icon={<RefreshCw size={13} />} onClick={() => void loadIssuers()} disabled={!live}>
              Refresh
            </Button>
          </div>
          <p className="mt-1 text-[14px] text-muted">Live from getAuthorizedIssuers().</p>
          <div className="mt-4" aria-live="polite">
            {!live && <p className="text-[15px]">Available once the contract is configured and reachable.</p>}
            {issuers.kind === "loading" && <Spinner label="Reading issuers…" />}
            {issuers.kind === "error" && <p className="text-[15px]">Could not read issuers: {issuers.message}</p>}
            {issuers.kind === "ok" &&
              (issuers.list.length === 0 ? (
                <p className="text-[15px]">No wallets are authorized yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {issuers.list.map((a) => (
                    <li key={a} className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] bg-alu px-3 py-2">
                      <span className="mono">{a}</span>
                      {addressUrl(a) && <ExternalLink href={addressUrl(a)!} compact>BaseScan</ExternalLink>}
                    </li>
                  ))}
                </ul>
              ))}
          </div>
        </section>
      </div>

      <section className="paper mt-8 p-6 sm:p-8" aria-labelledby="events-h">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="events-h" className="heading-card flex items-center gap-2">
            <Activity size={22} aria-hidden="true" /> Recent contract events
          </h2>
          <Button size="sm" icon={<RefreshCw size={13} />} onClick={() => void loadEvents()} disabled={!live}>
            Refresh
          </Button>
        </div>
        <div className="mt-4" aria-live="polite">
          {!live && <p className="text-[15px]">Available once the contract is configured and reachable.</p>}
          {events.kind === "loading" && <Spinner label="Scanning event logs…" />}
          {events.kind === "error" && <p className="text-[15px]">Could not read events: {events.message}</p>}
          {events.kind === "ok" && (
            <>
              <p className="mb-3 text-[13px] text-muted">
                Blocks {events.scan.fromBlock.toLocaleString()}–{events.scan.toBlock.toLocaleString()}
                {events.scan.reachedDeployBlock ? " (back to deployment)" : " (most recent window only — set VITE_DEPLOY_BLOCK for full history)"}.
              </p>
              {events.scan.events.length === 0 ? (
                <p className="text-[15px]">No events in this range.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {events.scan.events.map((ev) => (
                    <EventRow key={`${ev.txHash}-${ev.logIndex}`} ev={ev} />
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

const EVENT_TONE: Record<RegistryEvent["name"], "ok" | "warn" | "bad" | "info"> = {
  IssuerAuthorized: "ok",
  IssuerDeauthorized: "bad",
  CertificateIssued: "info",
  CertificateCorrected: "warn",
  CertificateRevoked: "bad",
};

function EventRow({ ev }: { ev: RegistryEvent }) {
  const detail =
    ev.name === "IssuerAuthorized" || ev.name === "IssuerDeauthorized"
      ? `issuer ${ev.args.issuer}`
      : `certIdHash ${shortHex(ev.args.certIdHash, 10, 6)} · v${ev.args.version} · by ${shortHex(ev.args.issuer, 6, 4)} · “${ev.args.syntheticCode ?? ev.args.correctionReason ?? ev.args.reasonCode ?? ""}”`;
  const url = txUrl(ev.txHash);
  return (
    <li className="grid gap-2 rounded-[8px] border border-line px-3 py-2.5 md:grid-cols-[210px_1fr_auto] md:items-center">
      <Chip tone={EVENT_TONE[ev.name]}>{ev.name}</Chip>
      <span className="mono min-w-0">{detail}</span>
      <span className="flex items-center gap-2 text-[13px]">
        block {ev.blockNumber}
        {url ? <ExternalLink href={url} compact>Tx</ExternalLink> : <span className="mono">{shortHex(ev.txHash, 8, 6)}</span>}
      </span>
    </li>
  );
}

function IssuerForm({ onConfirmed }: { onConfirmed: () => void }) {
  const { wallet, connectWallet, roles, health } = useApp();
  const tx = useTransaction();
  const [address, setAddress] = useState("");
  const [touched, setTouched] = useState(false);
  const valid = isAddress(address.trim());
  const error = !address.trim() ? "Enter the issuer's wallet address." : valid ? null : "That is not a valid 0x address (42 characters).";

  const run = async (kind: "authorize" | "deauthorize") => {
    setTouched(true);
    if (!wallet.account) return void connectWallet();
    if (!valid) return;
    const target = getAddress(address.trim());
    const fn = kind === "authorize" ? "authorizeIssuer" : "deauthorizeIssuer";
    const result = await tx.run({
      meta: { action: kind === "authorize" ? "Authorize issuer" : "Deauthorize issuer", subject: target },
      preflight: (r) => r[fn].staticCall(target),
      send: (r) => r[fn](target),
    });
    if (result.phase === "confirmed") onConfirmed();
  };

  const busy = tx.state.phase === "preflight" || tx.state.phase === "awaiting-signature" || tx.state.phase === "pending";

  return (
    <section className="paper layered p-6 sm:p-8" aria-labelledby="perm-h">
      <h2 id="perm-h" className="heading-card">
        Issuer permissions
      </h2>
      <p className="mt-2 text-[15px] text-ink/80">Authorize a wallet to issue and correct certificates, or remove it. Non-admin wallets are refused by the contract with NotAdmin().</p>
      {health.status === "ok" && wallet.account && !roles.loading && !roles.isAdmin && (
        <p className="mt-3 rounded-[8px] bg-alu px-3 py-2 text-[14px]">This wallet is not the admin. You can still submit — the contract will refuse it.</p>
      )}
      <form
        className="mt-5 flex flex-col gap-4"
        noValidate
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void run("authorize");
        }}
      >
        <Field label="Issuer wallet address" htmlFor="issuer-addr" error={touched ? error : null} hint="Use a test wallet you control, e.g. MetaMask Account 2.">
          <input id="issuer-addr" className="field font-mono" placeholder="0x…" value={address} onChange={(e) => setAddress(e.target.value)} aria-invalid={touched && Boolean(error)} spellCheck={false} />
        </Field>
        {wallet.account && (
          <button type="button" className="self-start text-[13px] font-semibold underline underline-offset-4" onClick={() => setAddress(wallet.account!)}>
            Use my connected address
          </button>
        )}
        {valid && <HashBlock label="Checksummed" value={getAddress(address.trim())} copy={false} />}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" dot="go" icon={<UserCheck size={15} />} disabled={busy}>
            {wallet.account ? "Authorize issuer" : "Connect wallet"}
          </Button>
          <Button dot="alu" icon={<UserMinus size={15} />} disabled={busy} onClick={() => void run("deauthorize")}>
            Deauthorize
          </Button>
        </div>
      </form>
      <TxStatus state={tx.state} onDismiss={tx.reset} />
    </section>
  );
}
