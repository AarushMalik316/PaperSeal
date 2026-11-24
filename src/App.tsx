import { AppProvider, useApp } from "./state/AppContext";
import { Navbar } from "./components/Navbar";
import { Verifier } from "./views/Verifier";
import { IssuerDesk } from "./views/IssuerDesk";
import { Admin } from "./views/Admin";
import { JudgeDemoDrawer } from "./components/drawers/JudgeDemoDrawer";
import { ProjectNoteDrawer } from "./components/drawers/ProjectNoteDrawer";
import { SetupDrawer } from "./components/drawers/SetupDrawer";
import { PaperSealMark } from "./components/decor/Marks";
import { NETWORK_LABEL, addressUrl } from "./lib/config";
import { ExternalLink } from "./components/ui";
import { ClearanceView } from "./clearance/ClearanceView";

function Footer() {
  const { openDrawer, config } = useApp();
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <PaperSealMark size={32} />
          <div>
            <p className="text-[17px] font-semibold tracking-tight">PaperSeal</p>
            <p className="font-mono text-[11px] tracking-[0.06em] text-muted">HASH-IT-OUT 2026 · TRACK 1: DIGITAL IDENTITY · {NETWORK_LABEL.toUpperCase()}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] font-medium">
          <button type="button" className="underline decoration-amber decoration-2 underline-offset-4" onClick={() => openDrawer("note")}>
            Project Note
          </button>
          <button type="button" className="underline decoration-amber decoration-2 underline-offset-4" onClick={() => openDrawer("setup")}>
            Setup
          </button>
          {config.address && addressUrl(config.address) && <ExternalLink href={addressUrl(config.address)!}>Contract on BaseScan</ExternalLink>}
          <span className="text-muted">Synthetic data only. No personal data on-chain.</span>
        </div>
      </div>
    </footer>
  );
}

function Shell() {
  const { view, drawer, openDrawer } = useApp();
  const close = () => openDrawer(null);
  const home = view === "home";
  return (
    <>
      {!home && (
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-24 focus:z-[70] focus:rounded-[8px] focus:bg-panel focus:px-3 focus:py-2">
          Skip to content
        </a>
      )}
      <ClearanceView active={home} />
      <div className="hud-frame" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <Navbar />
      {!home && (
        <main id="main" className="fixed inset-0 z-10 overflow-y-auto overflow-x-hidden bg-obsidian">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(245,158,11,0.07),transparent)]" aria-hidden="true" />
          <div className="relative min-h-full">
            {view === "verify" && <Verifier />}
            {view === "issuer" && <IssuerDesk />}
            {view === "admin" && <Admin />}
          </div>
          <Footer />
        </main>
      )}
      {drawer === "judge" && <JudgeDemoDrawer onClose={close} />}
      {drawer === "note" && <ProjectNoteDrawer onClose={close} />}
      {drawer === "setup" && <SetupDrawer onClose={close} />}
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
