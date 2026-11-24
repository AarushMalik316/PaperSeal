import { useEffect, useState } from "react";
import { Menu, X, Wallet, ArrowLeftRight, Presentation, LayoutGrid } from "lucide-react";
import { useApp, type View } from "../state/AppContext";
import { NETWORK_LABEL, TARGET_CHAIN_NAME } from "../lib/config";
import { shortHex } from "../lib/format";
import { PaperSealMark } from "./decor/Marks";
import { ModeChip } from "./ModeBanner";
import { SUBJECT_ID, SUBJECT_TIER } from "../clearance/zones";

const LINKS: { view: View; label: string }[] = [
  { view: "verify", label: "Public Verifier" },
  { view: "issuer", label: "Issuer Desk" },
  { view: "admin", label: "Institution Admin" },
];

export function WalletStatus({ compact = false }: { compact?: boolean }) {
  const { wallet, onTargetChain, connectWallet, switchChain } = useApp();
  if (!wallet.available) {
    return (
      <span className="chip whitespace-nowrap" title="No browser wallet detected. Public verification works without one.">
        <span className="inline-block h-2 w-2 rounded-full bg-muted" aria-hidden="true" />
        NO WALLET · READ-ONLY
      </span>
    );
  }
  if (!wallet.account) {
    return (
      <button type="button" className="btn btn-sm" onClick={connectWallet} disabled={wallet.connecting}>
        <span className="btn-dot bg-steel" aria-hidden="true">
          <Wallet size={13} />
        </span>
        {wallet.connecting ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }
  if (!onTargetChain) {
    return (
      <button type="button" className="btn btn-sm" onClick={switchChain} title={`Wallet is on chain ${wallet.chainId}`}>
        <span className="btn-dot bg-amber" aria-hidden="true">
          <ArrowLeftRight size={13} />
        </span>
        Switch to {TARGET_CHAIN_NAME}
      </button>
    );
  }
  return (
    <span className="chip whitespace-nowrap" title={`${wallet.account} on ${NETWORK_LABEL}`}>
      <span className="inline-block h-2 w-2 rounded-full bg-go" aria-hidden="true" />
      <span>{shortHex(wallet.account, 6, 4)}</span>
      {!compact && <span className="text-muted">· {TARGET_CHAIN_NAME.toUpperCase()}</span>}
    </span>
  );
}

export function Navbar() {
  const { view, navigate, openDrawer, matrixOpen, setMatrixOpen, entered } = useApp();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [view]);
  if (view === "home" && !entered) return null;
  const home = view === "home";

  const matrixBtn = home && (
    <button type="button" onClick={() => setMatrixOpen(!matrixOpen)} aria-pressed={matrixOpen} className={`btn btn-sm ${matrixOpen ? "btn-accent" : ""}`}>
      <span className="btn-dot bg-amber" aria-hidden="true">
        <LayoutGrid size={13} />
      </span>
      Access Matrix
    </button>
  );

  return (
    <header className="hud-fade fixed inset-x-0 top-0 z-50 px-5 pt-4 sm:px-6">
      <div className="flex items-start gap-3">
        {/* top-left: wordmark + subject pill + data-source mode */}
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate("home")} className="flex items-center gap-2 rounded-[8px] py-1 pr-1 text-[19px] font-semibold tracking-[-0.02em]" aria-label="PaperSeal home">
              <PaperSealMark size={28} />
              <span>PaperSeal</span>
            </button>
            <span className="chip hidden whitespace-nowrap md:inline-flex xl:hidden min-[1400px]:inline-flex" title="Subject of the Clearance matrix">
              <span className="text-amber">ID</span> {SUBJECT_ID} · {SUBJECT_TIER}
            </span>
          </div>
          <ModeChip />
        </div>

        {/* top-right */}
        <div className="ml-auto hidden items-center gap-2 xl:flex">
          <nav aria-label="Consoles">
            <ul className="flex items-center gap-1 rounded-[10px] border border-line bg-obsidian/80 p-1">
              {LINKS.map((l) => (
                <li key={l.view}>
                  <button
                    type="button"
                    onClick={() => navigate(l.view)}
                    aria-current={view === l.view ? "page" : undefined}
                    className={`whitespace-nowrap rounded-[7px] px-3 py-1.5 text-[14px] font-medium ${view === l.view ? "bg-amber text-obsidian" : "text-ink/80 hover:bg-alu hover:text-ink"}`}
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <button type="button" onClick={() => openDrawer("judge")} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[8px] px-2.5 py-1.5 text-[14px] font-medium text-ink/70 hover:bg-alu hover:text-ink">
            <Presentation size={15} aria-hidden="true" /> Judge Demo
          </button>
          <WalletStatus />
          {matrixBtn}
        </div>

        <div className="ml-auto flex items-center gap-2 xl:hidden">
          <span className="hidden md:inline-flex">{matrixBtn}</span>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-[10px] border border-edge bg-obsidian/85"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="ml-auto mt-2 w-[min(320px,100%)] rounded-[12px] border border-edge bg-panel p-2 xl:hidden">
          <ul className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <li key={l.view}>
                <button
                  type="button"
                  onClick={() => navigate(l.view)}
                  aria-current={view === l.view ? "page" : undefined}
                  className={`w-full rounded-[8px] px-3 py-2.5 text-left text-[15px] font-medium ${view === l.view ? "bg-amber text-obsidian" : "hover:bg-alu"}`}
                >
                  {l.label}
                </button>
              </li>
            ))}
            {home && (
              <li className="md:hidden">
                <button type="button" onClick={() => { setOpen(false); setMatrixOpen(!matrixOpen); }} className="w-full rounded-[8px] px-3 py-2.5 text-left text-[15px] font-medium hover:bg-alu">
                  Access Matrix
                </button>
              </li>
            )}
            <li>
              <button type="button" onClick={() => { setOpen(false); openDrawer("judge"); }} className="w-full rounded-[8px] px-3 py-2.5 text-left text-[15px] font-medium hover:bg-alu">
                Judge Demo
              </button>
            </li>
          </ul>
          <div className="mt-2 border-t border-line px-2 pt-3">
            <WalletStatus />
          </div>
        </div>
      )}
    </header>
  );
}
