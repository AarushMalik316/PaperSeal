// Deploys CertificateRegistry and prints the values for your .env.
//
//   npm run deploy:local          # local Hardhat node (chain 31337) — NOT Base Sepolia
//   npm run deploy:base-sepolia   # Base Sepolia (84532), needs DEPLOYER_PRIVATE_KEY in .env
//
// Key-free alternative: open PaperSeal → Setup → "Deploy with MetaMask".
import hre from "hardhat";

const { ethers, network } = hre;

const [deployer] = await ethers.getSigners();
if (!deployer) {
  throw new Error(
    "No deployer account. For Base Sepolia either deploy from the PaperSeal setup panel with MetaMask, " +
      "or set DEPLOYER_PRIVATE_KEY (a throwaway testnet-only key) in your local, git-ignored .env.",
  );
}
const { chainId } = await ethers.provider.getNetwork();
console.log(`Network: ${network.name} (chain ${chainId})`);
console.log(`Deployer / admin: ${deployer.address}`);

const registry = await ethers.deployContract("CertificateRegistry");
const deployTx = registry.deploymentTransaction();
console.log(`Deployment tx sent: ${deployTx.hash}`);
const receipt = await deployTx.wait();
const address = await registry.getAddress();

console.log("\nConfirmed. Add these to .env:");
console.log(`VITE_CONTRACT_ADDRESS=${address}`);
console.log(`VITE_DEPLOY_BLOCK=${receipt.blockNumber}`);
if (chainId === 31337n) {
  console.log("VITE_CHAIN_ID=31337");
  console.log("VITE_RPC_URL=http://127.0.0.1:8545");
  console.log("\n(Local Hardhat node — not Base Sepolia. Nothing here is publicly verifiable.)");
} else if (chainId === 84532n) {
  console.log(`\nBaseScan: https://sepolia.basescan.org/address/${address}`);
  console.log(`Deploy tx: https://sepolia.basescan.org/tx/${deployTx.hash}`);
}
