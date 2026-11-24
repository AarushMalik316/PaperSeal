import { AlertTriangle, CheckCircle2, CircleDashed, Settings2, WifiOff, FlaskConical } from "lucide-react";
import { useApp } from "../state/AppContext";
import { IS_BASE_SEPOLIA, NETWORK_LABEL, RPC_URL, TARGET_CHAIN_ID, addressUrl, ENV_CONTRACT_INVALID } from "../lib/config";
import { shortHex } from "../lib/format";
import { ExternalLink } from "./ui";
import type { ReactNode } from "react";

/** Always-visible statement of where data comes from. Never implies "live" without a confirmed RPC + code check. */
export function ModeBanner() {
  const { health, config, openDrawer, refreshHealth } = useApp();

  let dot = "bg-alu";
  let icon: ReactNode = <CircleDashed size={15} aria-hidden="true" />;
  let title = "";
  let body: ReactNode = null;
  let action: ReactNode = null;

  const setupBtn = (
    <button type="button" className="btn btn-sm" onClick={() => openDrawer("setup")}>
      <span className="btn-dot bg-amber" aria-hidden="true">
        <Settings2 size={13} />
      </span>
      Open setup
    </button>
  );

  switch (health.status) {
    case "unconfigured":
      dot = "bg-amber";
      icon = <Settings2 size={15} aria-hidden="true" />;
      title = "Unconfigured · Setup Required";
      body = ENV_CONTRACT_INVALID
        ? "VITE_CONTRACT_ADDRESS is not a valid address. No certificate data is shown until a real deployed contract is configured."
        : "No CertificateRegistry address is configured. No certificate data is shown until a real deployed contract is set in .env.";
      action = setupBtn;
      break;
    case "checking":
      title = `Checking ${NETWORK_LABEL}…`;
      body = "Contacting the RPC and confirming contract code exists at the configured address.";
      break;
    case "rpc-error":
      dot = "bg-stop";
      icon = <WifiOff size={15} aria-hidden="true" />;
      title = "Unable to reach the RPC";
      body = `${RPC_URL} did not respond. Reads will fail — this is a connection problem, not a verdict on any certificate.`;
      action = (
        <button type="button" className="btn btn-sm btn-plain" onClick={() => void refreshHealth()}>
          Retry
        </button>
      );
      break;
    case "chain-mismatch":
      dot = "bg-stop";
      icon = <AlertTriangle size={15} aria-hidden="true" />;
      title = "RPC is on the wrong chain";
      body = `The RPC reports chain ${health.rpcChainId}; PaperSeal expects ${TARGET_CHAIN_ID}. Fix VITE_RPC_URL.`;
      action = setupBtn;
      break;
    case "no-code":
      dot = "bg-stop";
      icon = <AlertTriangle size={15} aria-hidden="true" />;
      title = "No contract found at the configured address";
      body = `There is no contract code at ${config.address} on ${NETWORK_LABEL}. Check VITE_CONTRACT_ADDRESS.`;
      action = setupBtn;
      break;
    case "ok":
      if (IS_BASE_SEPOLIA) {
        dot = "bg-go";
        icon = <CheckCircle2 size={15} aria-hidden="true" />;
        title = `Connected · Base Sepolia (${TARGET_CHAIN_ID})`;
      } else {
        dot = "bg-steel";
        icon = <FlaskConical size={15} aria-hidden="true" />;
        title = `Local Dev Chain (${TARGET_CHAIN_ID}) · Not Base Sepolia`;
      }
      body = (
        <>
          CertificateRegistry <span className="font-mono text-[13px]">{shortHex(config.address ?? "", 8, 6)}</span>
          {health.latestBlock !== undefined && <> · block {health.latestBlock.toLocaleString()}</>}
          {config.source === "browser" && <> · address from this browser's setup (not .env)</>}
          {!IS_BASE_SEPOLIA && <> · nothing here is publicly verifiable</>}
        </>
      );
      action = config.address && addressUrl(config.address) ? <ExternalLink href={addressUrl(config.address)!} compact>BaseScan</ExternalLink> : null;
      break;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[8px] border border-edge bg-panel px-3 py-2" role="status" aria-live="polite">
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border border-edge ${dot}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold leading-tight">{title}</p>
        {body && <p className="text-[13px] leading-snug text-ink/75">{body}</p>}
      </div>
      {action}
    </div>
  );
}

/** Compact one-line data-source indicator for the HUD. */
export function ModeChip() {
  const { health, openDrawer } = useApp();
  let dot = "bg-muted";
  let text = "";
  switch (health.status) {
    case "unconfigured":
      dot = "bg-amber";
      text = "UNCONFIGURED · SETUP REQUIRED";
      break;
    case "checking":
      text = `CHECKING ${NETWORK_LABEL.toUpperCase()}…`;
      break;
    case "rpc-error":
      dot = "bg-stop";
      text = "RPC UNREACHABLE · NOT A VERDICT";
      break;
    case "chain-mismatch":
      dot = "bg-stop";
      text = "RPC ON WRONG CHAIN";
      break;
    case "no-code":
      dot = "bg-stop";
      text = "NO CONTRACT AT ADDRESS";
      break;
    case "ok":
      dot = IS_BASE_SEPOLIA ? "bg-go" : "bg-steel";
      text = IS_BASE_SEPOLIA ? `CONNECTED · BASE SEPOLIA (${TARGET_CHAIN_ID})` : `LOCAL DEV CHAIN (${TARGET_CHAIN_ID}) · NOT BASE SEPOLIA`;
      break;
  }
  const clickable = health.status !== "ok" && health.status !== "checking";
  const inner = (
    <>
      <span className={`inline-block h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
      {text}
    </>
  );
  return clickable ? (
    <button type="button" onClick={() => openDrawer("setup")} className="chip w-fit hover:border-amber" title="Open setup">
      {inner}
    </button>
  ) : (
    <span className="chip w-fit" role="status">
      {inner}
    </span>
  );
}
