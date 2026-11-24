import { useState } from "react";
import { ContractFactory } from "ethers";
import { Rocket, Trash2 } from "lucide-react";
import { useApp } from "../../state/AppContext";
import {
  ENV_CONTRACT_ADDRESS,
  IS_BASE_SEPOLIA,
  NETWORK_LABEL,
  RPC_URL,
  TARGET_CHAIN_ID,
  TARGET_CHAIN_NAME,
  addressUrl,
  clearContractOverride,
  saveContractOverride,
  txUrl,
} from "../../lib/config";
import { REGISTRY_ABI, REGISTRY_BYTECODE } from "../../lib/registry";
import { getSigner } from "../../lib/wallet";
import { decodeError, type DecodedError } from "../../lib/errors";
import { Button, CopyButton, ExternalLink, HashBlock, Spinner } from "../ui";
import { Drawer } from "./Drawer";

type DeployState =
  | { phase: "idle" }
  | { phase: "awaiting-signature" }
  | { phase: "pending"; hash: string }
  | { phase: "confirmed"; hash: string; address: string; block: number }
  | { phase: "failed"; error: DecodedError; hash?: string };

export function SetupDrawer({ onClose }: { onClose: () => void }) {
  const { config, provider, wallet, onTargetChain, connectWallet, switchChain, reloadConfig, health } = useApp();
  const [deploy, setDeploy] = useState<DeployState>({ phase: "idle" });

  const runDeploy = async () => {
    if (!provider) return;
    setDeploy({ phase: "awaiting-signature" });
    try {
      const signer = await getSigner(provider);
      const factory = new ContractFactory(REGISTRY_ABI, REGISTRY_BYTECODE, signer);
      const contract = await factory.deploy();
      const tx = contract.deploymentTransaction();
      if (!tx) throw new Error("No deployment transaction returned by the wallet.");
      setDeploy({ phase: "pending", hash: tx.hash });
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1 || !receipt.contractAddress) throw new Error("Deployment did not confirm successfully.");
      setDeploy({ phase: "confirmed", hash: receipt.hash, address: receipt.contractAddress, block: receipt.blockNumber });
    } catch (e) {
      setDeploy((d) => ({ phase: "failed", error: decodeError(e), hash: d.phase === "pending" ? d.hash : undefined }));
    }
  };

  const envLines = (address: string, block: number) =>
    [`VITE_CONTRACT_ADDRESS=${address}`, `VITE_DEPLOY_BLOCK=${block}`, ...(IS_BASE_SEPOLIA ? [] : [`VITE_CHAIN_ID=${TARGET_CHAIN_ID}`, `VITE_RPC_URL=${RPC_URL}`])].join("\n");

  return (
    <Drawer title="Setup" labelId="setup-drawer-title" onClose={onClose}>
      <div className="flex flex-col gap-5 text-[15px]">
        <section className="rounded-[8px] border border-edge bg-panel p-4">
          <h3 className="text-[17px] font-semibold">Current configuration</h3>
          <dl className="mt-2 grid gap-1 text-[14px]">
            <div><dt className="inline font-semibold">Target network: </dt><dd className="inline">{NETWORK_LABEL}</dd></div>
            <div><dt className="inline font-semibold">RPC: </dt><dd className="inline font-mono text-[13px] [overflow-wrap:anywhere]">{RPC_URL}</dd></div>
            <div>
              <dt className="inline font-semibold">Contract: </dt>
              <dd className="inline font-mono text-[13px] [overflow-wrap:anywhere]">
                {config.address ?? "Unconfigured (.env)"} {config.source === "browser" && "(browser override)"}
              </dd>
            </div>
            <div><dt className="inline font-semibold">Status: </dt><dd className="inline">{health.status}</dd></div>
          </dl>
          {config.source === "browser" && (
            <div className="mt-3">
              <Button size="sm" icon={<Trash2 size={13} />} onClick={() => { clearContractOverride(); reloadConfig(); }}>
                Clear browser override
              </Button>
            </div>
          )}
        </section>

        <section className="rounded-[8px] border border-edge bg-panel p-4">
          <h3 className="text-[17px] font-semibold">Option A · Deploy from this page with MetaMask (no private keys)</h3>
          <p className="mt-1 text-ink/80">
            Deploys the compiled <span className="font-mono text-[13px]">CertificateRegistry.sol</span> from your connected wallet. That wallet becomes the
            institution <strong>admin</strong>. You need a little {TARGET_CHAIN_NAME} test ETH.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {!wallet.account ? (
              <Button dot="steel" icon={<Rocket size={14} />} onClick={connectWallet} disabled={!wallet.available}>
                {wallet.available ? "Connect wallet first" : "No wallet detected"}
              </Button>
            ) : !onTargetChain ? (
              <Button dot="amber" icon={<Rocket size={14} />} onClick={switchChain}>
                Switch to {TARGET_CHAIN_NAME}
              </Button>
            ) : (
              <Button dot="go" icon={<Rocket size={14} />} onClick={runDeploy} disabled={deploy.phase === "awaiting-signature" || deploy.phase === "pending"}>
                Deploy CertificateRegistry
              </Button>
            )}
          </div>
          <div className="mt-3 flex flex-col gap-2" aria-live="polite">
            {deploy.phase === "awaiting-signature" && <Spinner label="Awaiting Signature — confirm in your wallet" />}
            {deploy.phase === "pending" && (
              <>
                <Spinner label="Pending Confirmation" />
                <HashBlock label="Deployment tx (pending)" value={deploy.hash} href={txUrl(deploy.hash)} />
              </>
            )}
            {deploy.phase === "failed" && (
              <div className="rounded-[8px] border border-edge bg-obsidian p-3" role="alert">
                <p className="font-semibold">Failed · {deploy.error.title}</p>
                <p className="text-ink/80">{deploy.error.message}</p>
              </div>
            )}
            {deploy.phase === "confirmed" && (
              <div className="flex flex-col gap-2">
                <p className="font-semibold">Confirmed · contract deployed</p>
                <HashBlock label="Contract address" value={deploy.address} href={addressUrl(deploy.address)} />
                <HashBlock label="Deployment transaction" value={deploy.hash} href={txUrl(deploy.hash)} />
                <p className="text-sm text-ink/80">Add these lines to <span className="font-mono">.env</span> and restart <span className="font-mono">npm run dev</span>:</p>
                <pre className="overflow-x-auto rounded-[8px] bg-alu p-3 font-mono text-[13px]">{envLines(deploy.address, deploy.block)}</pre>
                <div className="flex flex-wrap gap-2">
                  <CopyButton value={envLines(deploy.address, deploy.block)} label="Copy .env lines" />
                  {!ENV_CONTRACT_ADDRESS && (
                    <Button size="sm" dot="go" icon={<Rocket size={13} />} onClick={() => { saveContractOverride(deploy.address, deploy.block); reloadConfig(); }}>
                      Use now in this browser
                    </Button>
                  )}
                </div>
                {txUrl(deploy.hash) && <ExternalLink href={txUrl(deploy.hash)!}>Open deployment on BaseScan</ExternalLink>}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[8px] border border-line bg-panel p-4">
          <h3 className="text-[17px] font-semibold">Option B · Remix + MetaMask</h3>
          <ol className="mt-1 list-decimal pl-5 text-ink/80">
            <li>Open remix.ethereum.org and paste <span className="font-mono text-[13px]">contracts/CertificateRegistry.sol</span>.</li>
            <li>Compile with Solidity 0.8.24 (optimizer on, 200 runs).</li>
            <li>Deploy using “Injected Provider – MetaMask” on {NETWORK_LABEL}.</li>
            <li>Copy the contract address and deployment block into <span className="font-mono text-[13px]">.env</span>.</li>
          </ol>
        </section>

        <section className="rounded-[8px] border border-line bg-panel p-4">
          <h3 className="text-[17px] font-semibold">Option C · Hardhat CLI</h3>
          <p className="mt-1 text-ink/80">
            Put a throwaway, testnet-only key in your local, git-ignored <span className="font-mono text-[13px]">.env</span> as{" "}
            <span className="font-mono text-[13px]">DEPLOYER_PRIVATE_KEY</span>, then run:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-[8px] bg-alu p-3 font-mono text-[13px]">npm run deploy:base-sepolia</pre>
          <p className="mt-2 text-sm text-muted">Never share a key or seed phrase with anyone — PaperSeal never asks for one.</p>
        </section>
      </div>
    </Drawer>
  );
}
