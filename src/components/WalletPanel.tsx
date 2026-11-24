import { RefreshCw, Wallet } from "lucide-react";
import { useApp } from "../state/AppContext";
import { NETWORK_LABEL, TARGET_CHAIN_NAME, addressUrl } from "../lib/config";
import { Button, Chip, HashBlock } from "./ui";

/** Connected wallet + live on-chain role, for the Issuer Desk and Admin views. */
export function WalletPanel({ role }: { role: "issuer" | "admin" }) {
  const { wallet, onTargetChain, connectWallet, switchChain, roles, refreshRoles, health } = useApp();
  const live = health.status === "ok";

  return (
    <section className="paper p-5 sm:p-7" aria-labelledby={`${role}-wallet-h`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${role}-wallet-h`} className="heading-card">
          Your wallet
        </h2>
        {live && wallet.account && (
          <Button size="sm" icon={<RefreshCw size={13} />} onClick={() => void refreshRoles()} disabled={roles.loading}>
            {roles.loading ? "Reading contract…" : "Re-check role"}
          </Button>
        )}
      </div>

      {!wallet.available && (
        <p className="mt-3 text-[15px] text-ink/80">
          No browser wallet detected. Install MetaMask to act as {role === "admin" ? "the Institution Admin" : "an Authorized Issuer"}. Public verification works without a wallet.
        </p>
      )}
      {wallet.available && !wallet.account && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button icon={<Wallet size={15} />} dot="steel" onClick={connectWallet} disabled={wallet.connecting}>
            {wallet.connecting ? "Connecting…" : "Connect MetaMask"}
          </Button>
          <span className="text-sm text-muted">Only needed to sign transactions.</span>
        </div>
      )}
      {wallet.error && <p className="mt-3 text-sm">{wallet.error}</p>}

      {wallet.account && (
        <div className="mt-4 flex flex-col gap-3">
          <HashBlock label="Connected address" value={wallet.account} href={addressUrl(wallet.account)} />
          <div className="flex flex-wrap gap-2">
            {onTargetChain ? (
              <Chip tone="ok">Wallet on {NETWORK_LABEL}</Chip>
            ) : (
              <>
                <Chip tone="warn">Wallet on chain {wallet.chainId ?? "?"} — wrong network</Chip>
                <Button size="sm" dot="amber" icon={<span className="text-[11px] font-bold">⇄</span>} onClick={switchChain}>
                  Switch to {TARGET_CHAIN_NAME}
                </Button>
              </>
            )}
            {!live ? (
              <Chip tone="neutral">Role unknown — contract not reachable</Chip>
            ) : roles.loading ? (
              <Chip tone="neutral">Reading role from contract…</Chip>
            ) : role === "issuer" ? (
              roles.isIssuer ? (
                <Chip tone="ok">isAuthorizedIssuer = true</Chip>
              ) : (
                <Chip tone="bad">isAuthorizedIssuer = false · contract will reject writes</Chip>
              )
            ) : roles.isAdmin ? (
              <Chip tone="ok">Matches on-chain admin()</Chip>
            ) : (
              <Chip tone="bad">Not the admin · contract will reject changes</Chip>
            )}
          </div>
          {roles.error && <p className="text-sm">Could not read role: {roles.error}</p>}
        </div>
      )}
    </section>
  );
}
