// Minimal EIP-1193 (MetaMask / injected wallet) helpers.
import { BrowserProvider, type JsonRpcSigner } from "ethers";
import { BASE_SEPOLIA, IS_BASE_SEPOLIA, RPC_URL, TARGET_CHAIN_HEX, TARGET_CHAIN_NAME } from "./config";

export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export function getInjected(): Eip1193Provider | null {
  return typeof window !== "undefined" && window.ethereum ? window.ethereum : null;
}

export async function requestAccounts(eth: Eip1193Provider): Promise<string[]> {
  return (await eth.request({ method: "eth_requestAccounts" })) as string[];
}

export async function readAccounts(eth: Eip1193Provider): Promise<string[]> {
  return (await eth.request({ method: "eth_accounts" })) as string[];
}

export async function readChainId(eth: Eip1193Provider): Promise<number> {
  return Number(BigInt((await eth.request({ method: "eth_chainId" })) as string));
}

/** Switches the wallet to the target chain, adding Base Sepolia if it is unknown. */
export async function switchToTargetChain(eth: Eip1193Provider): Promise<void> {
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: TARGET_CHAIN_HEX }] });
  } catch (err) {
    const code = (err as { code?: number; data?: { originalError?: { code?: number } } }).code;
    const nested = (err as { data?: { originalError?: { code?: number } } }).data?.originalError?.code;
    if (code !== 4902 && nested !== 4902) throw err;
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [
        IS_BASE_SEPOLIA
          ? {
              chainId: BASE_SEPOLIA.chainIdHex,
              chainName: BASE_SEPOLIA.name,
              nativeCurrency: BASE_SEPOLIA.nativeCurrency,
              rpcUrls: [BASE_SEPOLIA.rpcUrl],
              blockExplorerUrls: [BASE_SEPOLIA.explorerUrl],
            }
          : {
              chainId: TARGET_CHAIN_HEX,
              chainName: TARGET_CHAIN_NAME,
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              rpcUrls: [RPC_URL],
            },
      ],
    });
  }
}

export async function getSigner(eth: Eip1193Provider): Promise<JsonRpcSigner> {
  return new BrowserProvider(eth, "any").getSigner();
}
