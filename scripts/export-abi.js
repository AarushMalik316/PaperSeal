// Copies the compiled ABI + bytecode from Hardhat artifacts into the frontend.
// Run via `npm run compile` after editing contracts/CertificateRegistry.sol.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const artifactPath = join(root, "artifacts/contracts/CertificateRegistry.sol/CertificateRegistry.json");
const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
const outDir = join(root, "src/lib/contract");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, "CertificateRegistry.json"),
  JSON.stringify({ contractName: artifact.contractName, abi: artifact.abi, bytecode: artifact.bytecode }, null, 2) + "\n",
);
console.log(`Exported ABI (${artifact.abi.length} entries) and bytecode to src/lib/contract/CertificateRegistry.json`);
