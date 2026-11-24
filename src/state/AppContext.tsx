import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { TARGET_CHAIN_ID, readContractConfig, type ContractConfig } from "../lib/config";
import { checkHealth, fetchAdmin, fetchIsAuthorized, type Health } from "../lib/registry";
import {
  getInjected,
  readAccounts,
  readChainId,
  requestAccounts,
  switchToTargetChain,
  type Eip1193Provider,
} from "../lib/wallet";
import { decodeError } from "../lib/errors";
import { sameAddress } from "../lib/format";
import type { PassData } from "../components/pass/types";

export type View = "home" | "verify" | "issuer" | "admin";
const VIEWS: View[] = ["home", "verify", "issuer", "admin"];

export interface WalletState {
  available: boolean;
  account: string | null;
  chainId: number | null;
  connecting: boolean;
  error: string | null;
}

export interface Roles {
  loading: boolean;
  admin: string | null;
  isAdmin: boolean;
  isIssuer: boolean;
  error: string | null;
}

export type Drawer = "judge" | "note" | "setup" | null;

interface AppContextValue {
  view: View;
  certParam: string;
  navigate: (view: View, opts?: { cert?: string }) => void;
  config: ContractConfig;
  reloadConfig: () => void;
  health: Health;
  refreshHealth: () => Promise<void>;
  wallet: WalletState;
  onTargetChain: boolean;
  connectWallet: () => Promise<void>;
  switchChain: () => Promise<void>;
  roles: Roles;
  refreshRoles: () => Promise<void>;
  activePass: PassData | null;
  setActivePass: (pass: PassData | null) => void;
  drawer: Drawer;
  openDrawer: (d: Drawer) => void;
  provider: Eip1193Provider | null;
  /** Clearance gate has been opened this session. */
  entered: boolean;
  setEntered: (v: boolean) => void;
  matrixOpen: boolean;
  setMatrixOpen: (v: boolean) => void;
  activeZone: number;
  setActiveZone: (i: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function readUrl(): { view: View; cert: string } {
  const params = new URLSearchParams(window.location.search);
  const cert = params.get("cert")?.trim() ?? "";
  const v = params.get("view") as View | null;
  const view = v && VIEWS.includes(v) ? v : cert ? "verify" : "home";
  return { view, cert };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(readUrl, []);
  const [view, setView] = useState<View>(initial.view);
  const [certParam, setCertParam] = useState(initial.cert);
  const [config, setConfig] = useState<ContractConfig>(() => readContractConfig());
  const [health, setHealth] = useState<Health>({ status: config.address ? "checking" : "unconfigured" });
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [activePass, setActivePass] = useState<PassData | null>(null);
  // Deep links (e.g. a scanned QR code) skip the gate and go straight to the console.
  const [entered, setEntered] = useState(initial.view !== "home");
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [activeZone, setActiveZone] = useState(0);

  const provider = useMemo(() => getInjected(), []);
  const [wallet, setWallet] = useState<WalletState>({
    available: Boolean(provider),
    account: null,
    chainId: null,
    connecting: false,
    error: null,
  });
  const [roles, setRoles] = useState<Roles>({ loading: false, admin: null, isAdmin: false, isIssuer: false, error: null });

  // ----- routing -----
  const navigate = useCallback((next: View, opts?: { cert?: string }) => {
    const params = new URLSearchParams();
    if (next !== "home") params.set("view", next);
    if (opts?.cert) params.set("cert", opts.cert);
    const qs = params.toString();
    window.history.pushState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    setView(next);
    setCertParam(opts?.cert ?? "");
    setMatrixOpen(false);
    document.getElementById("main")?.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const onPop = () => {
      const { view: v, cert } = readUrl();
      setView(v);
      setCertParam(cert);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // ----- health -----
  const refreshHealth = useCallback(async () => {
    if (!config.address) {
      setHealth({ status: "unconfigured" });
      return;
    }
    setHealth((h) => ({ ...h, status: h.status === "ok" ? "ok" : "checking" }));
    setHealth(await checkHealth(config.address));
  }, [config.address]);

  useEffect(() => {
    void refreshHealth();
    const id = window.setInterval(() => void refreshHealth(), 45_000);
    return () => window.clearInterval(id);
  }, [refreshHealth]);

  const reloadConfig = useCallback(() => setConfig(readContractConfig()), []);

  // ----- wallet -----
  useEffect(() => {
    if (!provider) return;
    let cancelled = false;
    (async () => {
      try {
        const [accounts, chainId] = await Promise.all([readAccounts(provider), readChainId(provider)]);
        if (!cancelled) setWallet((w) => ({ ...w, account: accounts[0] ?? null, chainId }));
      } catch {
        /* wallet locked or unavailable */
      }
    })();
    const onAccounts = (...args: unknown[]) => {
      const accounts = (args[0] as string[]) ?? [];
      setWallet((w) => ({ ...w, account: accounts[0] ?? null }));
    };
    const onChain = (...args: unknown[]) => {
      setWallet((w) => ({ ...w, chainId: Number(BigInt(args[0] as string)) }));
    };
    provider.on?.("accountsChanged", onAccounts);
    provider.on?.("chainChanged", onChain);
    return () => {
      cancelled = true;
      provider.removeListener?.("accountsChanged", onAccounts);
      provider.removeListener?.("chainChanged", onChain);
    };
  }, [provider]);

  const connectWallet = useCallback(async () => {
    if (!provider) {
      setWallet((w) => ({ ...w, error: "No browser wallet found. Install MetaMask (or another EIP-1193 wallet) to act as Admin or Issuer." }));
      return;
    }
    setWallet((w) => ({ ...w, connecting: true, error: null }));
    try {
      const accounts = await requestAccounts(provider);
      const chainId = await readChainId(provider);
      setWallet((w) => ({ ...w, account: accounts[0] ?? null, chainId, connecting: false }));
    } catch (e) {
      setWallet((w) => ({ ...w, connecting: false, error: decodeError(e).message }));
    }
  }, [provider]);

  const switchChain = useCallback(async () => {
    if (!provider) return;
    try {
      await switchToTargetChain(provider);
      setWallet((w) => ({ ...w, error: null }));
    } catch (e) {
      setWallet((w) => ({ ...w, error: decodeError(e).message }));
    }
  }, [provider]);

  const onTargetChain = wallet.chainId === TARGET_CHAIN_ID;

  // ----- roles (read from the contract via RPC, never assumed) -----
  const rolesSeq = useRef(0);
  const refreshRoles = useCallback(async () => {
    const seq = ++rolesSeq.current;
    if (!config.address) {
      setRoles({ loading: false, admin: null, isAdmin: false, isIssuer: false, error: null });
      return;
    }
    setRoles((r) => ({ ...r, loading: true, error: null }));
    try {
      const admin = await fetchAdmin(config.address);
      const isIssuer = wallet.account ? await fetchIsAuthorized(config.address, wallet.account) : false;
      if (seq !== rolesSeq.current) return;
      setRoles({ loading: false, admin, isAdmin: sameAddress(admin, wallet.account), isIssuer, error: null });
    } catch (e) {
      if (seq !== rolesSeq.current) return;
      setRoles({ loading: false, admin: null, isAdmin: false, isIssuer: false, error: decodeError(e).message });
    }
  }, [config.address, wallet.account]);

  useEffect(() => {
    if (health.status === "ok") void refreshRoles();
    else setRoles({ loading: false, admin: null, isAdmin: false, isIssuer: false, error: null });
  }, [health.status, refreshRoles]);

  const value: AppContextValue = {
    view,
    certParam,
    navigate,
    config,
    reloadConfig,
    health,
    refreshHealth,
    wallet,
    onTargetChain,
    connectWallet,
    switchChain,
    roles,
    refreshRoles,
    activePass,
    setActivePass,
    drawer,
    openDrawer: setDrawer,
    provider,
    entered,
    setEntered,
    matrixOpen,
    setMatrixOpen,
    activeZone,
    setActiveZone,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
