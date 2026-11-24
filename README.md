# PaperSeal

**Blockchain-based educational certificate verification on Base Sepolia (Chain ID 84532).**
HASH-IT-OUT 2026 · Track 1: Digital Identity.

PaperSeal replaces the registrar's editable shared spreadsheet with three things:

- **contract-enforced issuer permissions**: only wallets the institution admin authorized can write;
- **an append-only version history**: a correction adds v2, and v1 stays forever, marked *Superseded*;
- **privacy-preserving public verification**: anyone checks a certificate with no wallet, and the file's SHA-256 is computed **locally in the browser** and never uploaded.

The contract stores **zero personal data**: only an ID hash, a document fingerprint, the issuer wallet, timestamps, version and status.

| Role | Needs | Can do |
| --- | --- | --- |
| Institution Admin | the deployer wallet | authorize / deauthorize issuer wallets, audit contract events |
| Authorized Issuer | an authorized wallet | issue v1, append corrections, revoke, and see proof receipts |
| Public Verifier | nothing | look up a certificate (or scan its QR), run the local tamper check, read the full history |

### The Clearance interface

The home screen is the **PaperSeal Clearance Matrix**: a dark, broadcast-control style 3D carousel built with Three.js r169 (EffectComposer → RenderPass → GTAOPass → OutputPass).

- **Security gate.** A split matte-black gatefold with a circular aperture shows the live carousel while it loads; the loader readout and six signal bars track real initialisation steps. **Authenticate & Enter** swings the panels open and dollies the camera into Zone 01.
- **Six zones = six contract rules.** Each bay is a rule in `CertificateRegistry.sol`. A credentialed subject steps onto the RFID pad of each bay. The lightbar and floor ring scan, then lock emerald (**ACCESS GRANTED**) or pulse crimson behind a laser barrier (**ACCESS DENIED**):

| Zone | Rule | Verdict |
| --- | --- | --- |
| 01 Issuer Authorization | `authorizeIssuer` (admin only) | Granted |
| 02 Certificate Issuance | `issueCertificate` (authorized issuer) | Granted |
| 03 Public Verification | `getCertificateHistory` (anyone) | Granted |
| 04 Unauthorized Write | `NotAuthorizedIssuer` | Denied |
| 05 Overwrite Vault | `CertificateAlreadyExists` / `CertificateIsRevoked` | Denied |
| 06 Correction Ledger | `correctCertificate` (append v2) | Granted |

  These verdicts describe the contract's written rules. They are labelled as such and are never shown as on-chain results. Live results come from the Verifier, Issuer Desk and Admin consoles. The **Access Matrix** and zone **dossiers** add a live check of your connected wallet's real role (read from `admin()` / `isAuthorizedIssuer`).
- **Controls.** Scroll, drag or swipe (with inertia), or use Arrow / Space / Page keys. The carousel snaps to the nearest bay after 0.85 s of rest. Hover objects to inspect them, and click to open the Zone Access Dossier. Bottom-right has a 3-step zoom, and top-right opens the **Access Matrix** overview.
- **Resilience.** A classic-script watchdog in `index.html` detects missing WebGL; the gate then opens into a static 2D matrix. A slow 3D start (10 s) also falls back so the gate can always open. `prefers-reduced-motion` disables the swing, dolly, pulses and inertia.

See [`PROJECT_NOTE.md`](./PROJECT_NOTE.md) for the one-page note (also inside the app: footer → *Project Note*), including the 5-minute demo script and post-deployment checklist.

---

## Stack

- **Contract:** Solidity 0.8.24 (`contracts/CertificateRegistry.sol`), Hardhat 2 + `@nomicfoundation/hardhat-toolbox`, tests in `test/`. Compilation uses the pinned `solc` npm package (solcjs), so it works offline and needs no compiler download.
- **Frontend:** Vite + React 18 + TypeScript, Tailwind CSS v4, Three.js r169 (lazy-loaded 3D Clearance stage), Motion (`motion/react`) for the certificate pass, `lucide-react` icons, `ethers` v6, `qrcode-generator` (inline-SVG QR), Space Grotesk + JetBrains Mono (Google Fonts, with system fallbacks).
- **Shared rule:** `shared/canonical.js` defines the certificate-ID hash, used by both the tests and the frontend:

  ```
  certIdHash = keccak256(utf8Bytes(certId.trim().toUpperCase()))
  ```

## Install & run locally

```bash
npm install
cp .env.example .env      # fill in after deploying (see below)
npm run dev               # http://localhost:5173
```

Without a contract address the app runs in **Unconfigured · Setup Required** mode (shown in the HUD and on every console). Every screen still renders, but no certificate data is shown and nothing is presented as live.

## Tests, lint, build

```bash
npm run test:contracts    # Hardhat / Mocha contract tests (17)
npm run test:web          # Vitest frontend tests (17)
npm test                  # both
npm run typecheck         # tsc -b
npm run lint              # ESLint
npm run build             # type-check + production build into dist/
```

After editing the contract, run `npm run compile`. It recompiles and copies the ABI and bytecode into `src/lib/contract/CertificateRegistry.json`, which the frontend imports. A Vitest check fails if the two drift apart.

## Deploy to Base Sepolia

You need MetaMask with a little Base Sepolia test ETH (from a faucet). **PaperSeal never asks for a private key or seed phrase.**

**Option A: from the app, with MetaMask (recommended, key-free)**
1. `npm run dev`, then click **Open setup** in the banner (or *Setup* in the footer).
2. Connect MetaMask. The app offers a one-click **Switch / Add Base Sepolia (84532)**.
3. Click **Deploy CertificateRegistry** and confirm in MetaMask. This wallet becomes the **admin**.
4. Once the deployment is **Confirmed**, copy the shown `.env` lines (`VITE_CONTRACT_ADDRESS`, `VITE_DEPLOY_BLOCK`) into `.env` and restart `npm run dev`. *(Or click "Use now in this browser" for an immediate, browser-only override. The banner says so.)*

**Option B: Remix.** Paste `contracts/CertificateRegistry.sol` into remix.ethereum.org. Compile with 0.8.24, optimizer on (200 runs), EVM `cancun`. Deploy with *Injected Provider – MetaMask* on Base Sepolia, then copy the address and deploy block into `.env`.

**Option C: Hardhat CLI.** Put a throwaway, **testnet-only** key in your local, git-ignored `.env` as `DEPLOYER_PRIVATE_KEY`, then run `npm run deploy:base-sepolia`. Optional verification: set `BASESCAN_API_KEY` and run `npx hardhat verify --network baseSepolia <address>`.

### `.env`

| Variable | Purpose |
| --- | --- |
| `VITE_CONTRACT_ADDRESS` | Deployed `CertificateRegistry` address (required for live mode) |
| `VITE_DEPLOY_BLOCK` | Deployment block, so event queries start there |
| `VITE_CHAIN_ID` | Defaults to `84532` (Base Sepolia). `31337` is for local development only |
| `VITE_RPC_URL` | Read RPC. Defaults to `https://sepolia.base.org` |
| `VITE_PUBLIC_APP_URL` | Public URL encoded in the pass QR code (defaults to the current page; set it for phone scanning) |
| `VITE_INSTITUTION_NAME` | Synthetic display name (default *Northbridge Technical Institute*) |
| `BASE_SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `BASESCAN_API_KEY` | Optional, CLI deploy/verify only; never sent to the browser |

When the RPC answers on chain 84532 **and** contract code exists at the address, the banner reads **Connected · Base Sepolia (84532)**. Otherwise it explains exactly what is wrong: unreachable RPC, wrong chain, or no code at the address.

## Connecting MetaMask

- Public verification needs **no wallet**: reads go straight to the RPC.
- For Admin / Issuer actions, click **Connect wallet** in the navbar. If MetaMask is on another network, the navbar shows **Switch to Base Sepolia**, which adds the network if needed (RPC `https://sepolia.base.org`, explorer `https://sepolia.basescan.org`).
- Recommended demo setup: **Account 1** = admin (deployer), **Account 2** = authorized issuer, **Account 3** = unauthorized wallet for the refusal demo.
- Transaction states are tracked honestly: contract pre-flight check → **Awaiting Signature** → **Pending Confirmation** → **Confirmed** (only after `tx.wait()` returns status 1), or **Failed / Reverted** with the decoded custom error.

## BaseScan links

On Base Sepolia, every confirmed proof receipt, history entry, issuer address and admin event links to `https://sepolia.basescan.org/tx/<hash>` or `/address/<addr>`. Links are only rendered from real hashes and addresses returned by the chain. On a local chain no explorer link is shown.

## Local development chain (optional, not Base Sepolia)

```bash
HARDHAT_MINE_FAILED_TX=1 npm run chain:local   # terminal 1 (env var: mine reverted txs like a real chain)
npm run deploy:local                           # terminal 2, prints VITE_* lines
```

Put the printed lines (including `VITE_CHAIN_ID=31337` and `VITE_RPC_URL=http://127.0.0.1:8545`) in `.env`. The banner then reads **Local Dev Chain (31337) · Not Base Sepolia**. Nothing on it is publicly verifiable, and it does not count as hackathon proof.

## Demo files

`public/samples/` holds synthetic files (fictional data only):

- `CERT-2026-SYN-001-original.txt`: issue this as v1
- `CERT-2026-SYN-001-tampered.txt`: one detail changed, gives **Fingerprint Mismatch**
- `CERT-2026-SYN-001-corrected-v2.txt`: use it for the correction. Afterwards the original reports **Superseded by Correction**

`.gitattributes` marks them `-text` so line endings (and therefore fingerprints) never change on checkout.

## What the contract refuses

`NotAuthorizedIssuer(caller)` · `NotAdmin()` · `CertificateAlreadyExists(certIdHash)` · `CertificateNotFound(certIdHash)` · `CertificateIsRevoked(certIdHash)` · `InvalidInput(field)`. Details are in `PROJECT_NOTE.md`.

The Issuer Desk's **Unauthorized-action demonstration** sends a real `eth_call` from the connected wallet to the deployed contract and decodes the actual revert. Optionally it broadcasts the transaction with a manual gas limit, so a **reverted transaction hash** exists on BaseScan. The button is never disabled; the refusal comes from the EVM.

## Privacy notes and limits

- Only `keccak256(certId)` and a SHA-256 file fingerprint are stored. **Hashes are not encryption.** Low-entropy or guessable identifiers (like `CERT-2026-SYN-001`) can be brute-forced or linked across records. A real deployment must keep names, student IDs, grades and the files themselves **off-chain** in the institution's systems, use high-entropy or salted identifiers, and publish only carefully designed proof data.
- A fingerprint match proves the file is byte-identical to what the issuer recorded. It does not independently prove that the facts in the file are true. Re-saving or re-exporting a file changes its fingerprint.
- All data in this repository is synthetic.

## Project layout

```
contracts/CertificateRegistry.sol   the registry
test/CertificateRegistry.test.js    contract tests
scripts/deploy.js                   Hardhat deploy (prints .env lines)
scripts/export-abi.js               copies ABI + bytecode to the frontend
shared/canonical.js                 certIdHash rule (tests + frontend)
src/lib/                            config, RPC reads, wallet, errors, hashing, verdict logic
src/state/                          app context, transaction lifecycle hook
src/clearance/                      3D Clearance home: gate, HUD, Access Matrix, dossier, zones
src/clearance/stage/                Three.js engine (carousel, dioramas, subject, textures)
src/components/                     certificate pass, receipts, drawers, HUD top bar, UI primitives
src/views/                          Verifier, IssuerDesk, Admin consoles
public/samples/                     synthetic demo files
PROJECT_NOTE.md                     one-page submission note
```
