import { CheckCircle2, CircleDashed, Download, RefreshCw, XCircle, ArrowRight } from "lucide-react";
import { useApp, type View } from "../../state/AppContext";
import { NETWORK_LABEL, SAMPLE_CERT_ID, SAMPLE_FILES, TARGET_CHAIN_NAME } from "../../lib/config";
import { shortHex } from "../../lib/format";
import { Button } from "../ui";
import { Drawer } from "./Drawer";

type Check = { label: string; state: "ok" | "fail" | "pending"; detail: string };

function useReadiness(): Check[] {
  const { config, health, wallet, onTargetChain, roles } = useApp();
  const live = health.status === "ok";
  return [
    {
      label: "Contract address configured",
      state: config.address ? "ok" : "fail",
      detail: config.address
        ? `${shortHex(config.address, 8, 6)} (from ${config.source === "env" ? ".env" : "this browser's setup"})`
        : "Missing — set VITE_CONTRACT_ADDRESS in .env (see Setup).",
    },
    {
      label: `${TARGET_CHAIN_NAME} RPC reachable`,
      state: health.status === "checking" ? "pending" : ["ok", "no-code"].includes(health.status) ? "ok" : "fail",
      detail:
        health.status === "unconfigured"
          ? "Not checked — no contract configured."
          : health.status === "rpc-error"
            ? "RPC did not respond."
            : health.status === "chain-mismatch"
              ? `RPC is on chain ${health.rpcChainId}, expected ${NETWORK_LABEL}.`
              : health.latestBlock !== undefined
                ? `Latest block ${health.latestBlock.toLocaleString()}`
                : "Checking…",
    },
    {
      label: "Contract code found at address",
      state: live ? "ok" : health.status === "checking" ? "pending" : "fail",
      detail: live ? "eth_getCode returned bytecode." : health.status === "no-code" ? "No code at this address." : "Not confirmed.",
    },
    {
      label: "Wallet connected",
      state: wallet.account ? "ok" : "fail",
      detail: wallet.account ? shortHex(wallet.account, 8, 6) : wallet.available ? "Click “Connect wallet” in the navbar." : "No browser wallet detected.",
    },
    {
      label: `Wallet on ${TARGET_CHAIN_NAME}`,
      state: wallet.account && onTargetChain ? "ok" : "fail",
      detail: wallet.account ? (onTargetChain ? NETWORK_LABEL : `Wallet is on chain ${wallet.chainId}. Use “Switch”.`) : "Connect a wallet first.",
    },
    {
      label: "Connected wallet is the Institution Admin",
      state: !live || !wallet.account ? "pending" : roles.isAdmin ? "ok" : "fail",
      detail: !live || !wallet.account ? "Needs a live contract and wallet." : roles.isAdmin ? "Matches admin()." : `admin() is ${shortHex(roles.admin ?? "", 8, 6)}.`,
    },
    {
      label: "Connected wallet is an Authorized Issuer",
      state: !live || !wallet.account ? "pending" : roles.isIssuer ? "ok" : "fail",
      detail: !live || !wallet.account ? "Needs a live contract and wallet." : roles.isIssuer ? "isAuthorizedIssuer = true" : "Not authorized (expected for beat 7).",
    },
  ];
}

const BEATS: { title: string; say: string; view?: View; cert?: boolean; cta?: string; matrix?: boolean }[] = [
  {
    title: "Why verifiable credentials?",
    say: "Employers verify degrees by emailing registrars or trusting a shared spreadsheet anyone with access can silently edit. Rotate the Clearance carousel: six zones, each a rule the contract enforces — four granted, two denied.",
    view: "home",
    cta: "Open the Clearance carousel",
  },
  {
    title: "Admin authorizes an issuer wallet",
    say: "Connect the admin wallet → Institution Admin → paste the issuer address → Authorize. Wait for “Confirmed” and show the proof receipt.",
    view: "admin",
    cta: "Open Institution Admin",
  },
  {
    title: "Issuer issues a synthetic certificate",
    say: `Switch MetaMask to the issuer account → Issuer Desk → ID ${SAMPLE_CERT_ID}, label “B.Sc. Distributed Systems”, drop the original sample file → Issue. Show the confirmed receipt.`,
    view: "issuer",
    cta: "Open Issuer Desk",
  },
  {
    title: "Public verifier looks it up — no wallet",
    say: "Open the verifier (or scan the pass QR). The result is read directly from the contract over RPC; no wallet is involved.",
    view: "verify",
    cert: true,
    cta: `Verify ${SAMPLE_CERT_ID}`,
  },
  {
    title: "Local SHA-256 tamper check",
    say: "Drop the original sample → Fingerprint Match. Drop the tampered sample (one word changed) → Fingerprint Mismatch. The file never leaves the browser.",
    view: "verify",
    cert: true,
    cta: "Open tamper check",
  },
  {
    title: "Issuer appends a correction",
    say: "Issuer Desk → Append correction with the corrected v2 sample. Verifier now shows v2 Current, v1 kept as Superseded. The original file now reports “Superseded by Correction”.",
    view: "issuer",
    cta: "Open correction form",
  },
  {
    title: "Unauthorized wallet is refused by the contract",
    say: "Switch MetaMask to a wallet that is NOT authorized → Unauthorized-action demonstration → Attempt. The live contract returns NotAuthorizedIssuer(address). Optionally broadcast anyway for a reverted tx hash.",
    view: "issuer",
    cta: "Open demonstration panel",
  },
  {
    title: "Close: why not a spreadsheet?",
    say: "Anyone can verify independently, only authorized wallets can write (the contract enforces it), and corrections append instead of overwrite. In production: names and grades stay in the institution's systems; only fingerprints go on-chain.",
    view: "home",
    cta: "Open Access Matrix (comparison)",
    matrix: true,
  },
];

export function JudgeDemoDrawer({ onClose }: { onClose: () => void }) {
  const { navigate, refreshHealth, refreshRoles, openDrawer, setMatrixOpen } = useApp();
  const checks = useReadiness();
  const missing = checks.filter((c) => c.state === "fail").map((c) => c.label);
  const coreReady = checks.slice(0, 3).every((c) => c.state === "ok");

  return (
    <Drawer title="Judge Demo" labelId="judge-drawer-title" onClose={onClose}>
      <div className="flex flex-col gap-5">
        <p className="text-[15px] text-ink/80">
          A guided five-minute walkthrough. Nothing here sends transactions for you or invents data — each step points to the real screen.
        </p>

        <section className="rounded-[8px] border border-edge bg-panel p-4" aria-labelledby="ready-h">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 id="ready-h" className="text-[17px] font-semibold">
              Demo readiness check
            </h3>
            <Button size="sm" icon={<RefreshCw size={13} />} onClick={() => { void refreshHealth(); void refreshRoles(); }}>
              Re-check
            </Button>
          </div>
          <ul className="flex flex-col gap-1.5">
            {checks.map((c) => (
              <li key={c.label} className="flex items-start gap-2">
                <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-edge ${c.state === "ok" ? "bg-go" : c.state === "fail" ? "bg-stop" : "bg-alu"}`} aria-hidden="true">
                  {c.state === "ok" ? <CheckCircle2 size={12} /> : c.state === "fail" ? <XCircle size={12} /> : <CircleDashed size={12} />}
                </span>
                <span className="text-[14px]">
                  <span className="font-semibold">
                    {c.label} — {c.state === "ok" ? "yes" : c.state === "fail" ? "no" : "waiting"}
                  </span>
                  <span className="block text-ink/70">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 rounded-[8px] bg-alu px-3 py-2 text-[14px]">
            {coreReady
              ? missing.length
                ? `Contract is live. Still to do: ${missing.join("; ")}. (Roles change during the demo — that's expected.)`
                : "Ready for the full demo."
              : "Not ready: the app has no live, confirmed contract yet. Open Setup to deploy and configure it."}
          </p>
          {!coreReady && (
            <div className="mt-2">
              <Button size="sm" dot="amber" icon={<ArrowRight size={13} />} onClick={() => openDrawer("setup")}>
                Open setup
              </Button>
            </div>
          )}
        </section>

        <section className="rounded-[8px] border border-edge bg-panel p-4" aria-labelledby="samples-h">
          <h3 id="samples-h" className="text-[17px] font-semibold">
            Synthetic sample files
          </h3>
          <p className="mb-2 text-[14px] text-ink/75">Fictional data only. The tampered file differs from the original by one detail.</p>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_FILES.map((f) => (
              <a key={f.key} href={f.path} download className="btn btn-sm">
                <span className="btn-dot bg-alu" aria-hidden="true">
                  <Download size={13} />
                </span>
                {f.label}
              </a>
            ))}
          </div>
        </section>

        <ol className="flex flex-col gap-3" aria-label="Demo beats">
          {BEATS.map((b, i) => (
            <li key={b.title} className="rounded-[8px] border border-line bg-panel p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-edge bg-amber text-[14px] font-bold">{i + 1}</span>
                <div className="min-w-0">
                  <h4 className="text-[16px] font-semibold">{b.title}</h4>
                  <p className="mt-1 text-[14px] text-ink/80">{b.say}</p>
                  {b.view && (
                    <button
                      type="button"
                      className="mt-2 inline-flex items-center gap-1 text-[14px] font-semibold underline decoration-amber decoration-2 underline-offset-4"
                      onClick={() => {
                        navigate(b.view!, b.cert ? { cert: SAMPLE_CERT_ID } : undefined);
                        if (b.matrix) setMatrixOpen(true);
                      }}
                    >
                      {b.cta} <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" className="self-start text-[14px] font-semibold underline underline-offset-4" onClick={() => openDrawer("note")}>
          Read the one-page Project Note
        </button>
      </div>
    </Drawer>
  );
}
