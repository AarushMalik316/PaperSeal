# PaperSeal

**Blockchain-based educational certificate verification on Base Sepolia (Chain ID 84532).**
HASH-IT-OUT 2026 · Track 1: Digital Identity · *Blockchain-Based Certificate Verification System*

PaperSeal lets an educational institution issue digital certificates that **anyone can verify without trusting them**. It replaces the registrar's editable shared spreadsheet with three things:

- **Contract-enforced issuer permissions.** Only wallets the institution admin has authorized can register certificates. The smart contract itself refuses everyone else.
- **An append-only history.** A correction adds a new version. The old version stays on-chain forever, marked *Superseded*. Nothing is edited or deleted.
- **Privacy-preserving public verification.** Anyone can check a certificate with no wallet and no account. The certificate file is fingerprinted **locally in the browser** (SHA-256) and never uploaded.

The contract stores **zero personal data**: only a hash of the certificate ID, the file's fingerprint, the issuer wallet, timestamps, the version number and the status.

---

## 1. Submission summary

> All values below are real, confirmed transactions on Base Sepolia. Open any link to check it on BaseScan.

| Form item | Value |
| --- | --- |
| **Project** | PaperSeal: Blockchain-Based Certificate Verification (Track 1: Digital Identity) |
| **Repo link** | https://github.com/AarushMalik316/PaperSeal |
| **Network** | Base Sepolia testnet, Chain ID `84532` |
| **Contract address** | `0x46636E242Ff0d76321C1bB91f34380aCE92f5ff9` |
| **Contract on BaseScan** | https://sepolia.basescan.org/address/0x46636E242Ff0d76321C1bB91f34380aCE92f5ff9 |
| **Tx #1: Admin authorizes an issuer wallet** | `0x2889ba0efd46e20052b7f41690e7b34fbe9ec736fccbf8bc1ba1588196f9e7ac` |
| **Tx #1 on BaseScan** | https://sepolia.basescan.org/tx/0x2889ba0efd46e20052b7f41690e7b34fbe9ec736fccbf8bc1ba1588196f9e7ac |
| **Tx #2: Issuer registers certificate `CERT-2026-SYN-001`** | `0x5b80b009b0352176966c3556b5e60b058aa9f9b3c2f82b6d154354d248f16fad` |
| **Tx #2 on BaseScan** | https://sepolia.basescan.org/tx/0x5b80b009b0352176966c3556b5e60b058aa9f9b3c2f82b6d154354d248f16fad |
| **One-page note** | [`PROJECT_NOTE.md`](./PROJECT_NOTE.md) (also in the app: footer, then *Project Note*) |

### Who did what

| Member | Contribution |
| --- | --- |
| Chitransh Rana | Smart contract (`CertificateRegistry.sol`): issuer permissions, append-only version history, revocation rules and Hardhat tests; Base Sepolia deployment and demo transactions |
| Aarush Malik | Frontend: Public Verifier, Issuer Desk and Institution Admin screens, MetaMask connection, local SHA-256 tamper check, 3D Clearance interface; README, project note and pitch |

## 2. Deliverables checklist

Everything the HASH-IT-OUT guide asks for, and where it lives in this project.

### The four things every team builds

| # | Requirement (from the guide) | PaperSeal | Status |
| --- | --- | --- | --- |
| 1 | **A smart contract on Base Sepolia** that stores the records | [`contracts/CertificateRegistry.sol`](./contracts/CertificateRegistry.sol): append-only certificate versions keyed by `keccak256(certId)` | **Done** (deployed) |
| 2 | **At least one rule the contract enforces**; it must refuse something | Refuses wrong wallets (`NotAuthorizedIssuer`, `NotAdmin`) and disallowed steps (`CertificateAlreadyExists`, `CertificateIsRevoked`, `CertificateNotFound`, `InvalidInput`) | Done (17 tests) |
| 3 | **A screen a stranger can use to finish one task, reading live from the contract** | Public Verifier: enter an ID, see a live verdict plus a local file tamper check, no wallet needed | Done |
| 4 | **Proof that it is real**: contract address and two transactions on the explorer | Section 1 table | **Done** |

### Product expectations ("think like a product team")

| Expectation | PaperSeal |
| --- | --- |
| **Three roles**: admin, operator, public reader | **Institution Admin** (authorizes issuer wallets), **Authorized Issuer** (issues and corrects with their own wallet), **Public Verifier** (no wallet, no explanation needed) |
| **A full journey**, not a single screen | Authorize → Issue → Verify → Tamper check → Correct → Refuse the wrong wallet ([demo script](#7-five-minute-demo-script)) |
| **A real person with a real problem; why better than a shared spreadsheet?** | An employer's hiring coordinator checking a graduate's certificate in under a minute ([Section 9](#9-why-not-a-shared-spreadsheet)) |
| **A path to real life**: no personal data on a public chain | Only hashes and fingerprints on-chain; names, IDs and grades stay off-chain ([Section 10](#10-privacy-limits-and-path-to-real-life)) |

### Submission form items

| Form item | Where | Status |
| --- | --- | --- |
| Repo link | Your GitHub repository ([step 3.5](#35-push-to-github-and-get-the-repo-link)) | **Done** |
| Contract address | [Step 3.2](#32-get-your-contract-address) | **Done** |
| Two transaction hashes + explorer links | [Steps 3.3–3.4](#33-make-the-two-real-transactions) | **Done** |
| One-page note (six headings) | [`PROJECT_NOTE.md`](./PROJECT_NOTE.md): *The user and their one task · On the blockchain · Only on the page · What the contract refuses · How to run the demo · Path to real life* | **Done** |
| Who did what | Section 1 table | **Done** |

### Rules compliance

| Rule | How PaperSeal complies |
| --- | --- |
| Fake data only | All samples are synthetic: `CERT-2026-SYN-001`, "Synthetic Learner S-001", *Northbridge Technical Institute* |
| Solidity on Base Sepolia | Solidity 0.8.24, Chain ID 84532 |
| No real money | Base Sepolia test ETH only (free from a faucet) |
| No secrets in the repo | `.env` is git-ignored; `.env.example` has variable names only. Deploying from the app needs no private key. |

### How it maps to the judging sheet

| Criterion (points) | What to show |
| --- | --- |
| **The chain does the job (25)** | Rules for two roles enforced in Solidity. Live refusal: Issuer Desk, then *Unauthorized-action demonstration*, then `NotAuthorizedIssuer(0x…)` decoded from the contract. Optionally broadcast it for a reverted tx on BaseScan. |
| **Front end and UX (20)** | Public Verifier works alone with clear verdicts (*Verified · Current*, *Superseded by Correction*, *Revoked*, *Fingerprint Mismatch*, *Not Found*, *Unable to Check*). Friendly errors and proof receipts. |
| **Works on the test network (15)** | Contract address loads on BaseScan; Tx #1 and Tx #2 match the story (authorize, then issue). |
| **Pitch (15)** | [Five-minute demo script](#7-five-minute-demo-script), ending with the path to real life |
| **The problem is specific (15)** | One user (employer's hiring coordinator), one task (verify a certificate), clear spreadsheet comparison |

---

## 3. How to fill in everything, step by step

> A printable illustrated version of steps 3.1–3.4 is in [`docs/PaperSeal_Base_Sepolia_Guide.pdf`](./docs/PaperSeal_Base_Sepolia_Guide.pdf).

### 3.1 One-time setup (MetaMask + test ETH)

1. **Install MetaMask** in Chrome from **metamask.io**. Create a wallet and write the 12-word Secret Recovery Phrase on paper.
   **Never share or type that phrase anywhere**, including websites, chats, forms or this app.
2. **Create three accounts** in MetaMask (account menu, then *Add account*, then *Add a new account*). Optionally rename them:
   - **Account 1 = Admin** (deploys the contract)
   - **Account 2 = Issuer** (gets authorized, then issues certificates)
   - **Account 3 = Outsider** (never authorized; used to show the contract refusing it)
3. **Show Base Sepolia in MetaMask.** Open the network menu, turn on **Show test networks**, and select **Base Sepolia** (or *Base Sepolia Testnet*). If it isn't listed, choose *Add a custom network* and enter:
   - Network name `Base Sepolia`
   - RPC URL `https://sepolia.base.org`
   - Chain ID `84532`
   - Symbol `ETH`
   - Explorer `https://sepolia.basescan.org`

   In the *Tokens* list, change the filter from *All default networks* to Base Sepolia, otherwise your test ETH stays hidden.
4. **Get free test ETH** for Account 1. Use the faucet link from the hackathon channel, or the Coinbase Developer Platform: **Onchain Tools**, then **Faucet**, network **Base Sepolia**, token **ETH**, paste Account 1's address, then **Claim**. Ignore anything that asks for business verification or real money.
5. **Send a little to Account 2** (e.g. a third of what you received). Transactions on Base Sepolia cost a tiny fraction of that.

### 3.2 Get your contract address

1. Start the app ([Section 4](#4-run-it-locally)) and open **http://localhost:5173**. Click **Authenticate & Enter**.
2. Click the **UNCONFIGURED · SETUP REQUIRED** chip at the top left. The **Setup** panel opens.
3. With **Account 1 (Admin)** selected in MetaMask, click **Connect wallet first**, then **Switch to Base Sepolia** if it appears, then **Deploy CertificateRegistry**. Confirm in MetaMask. If no popup appears, click the fox icon in Chrome.
4. Wait for **Confirmed · contract deployed**. Copy the **Contract address**: that is your *Contract address* for Section 1.
5. Click **Copy .env lines** and save them into `.env`:
   - **Mac:** in Terminal, press **Control + C** to stop the app, then run `open -e .env`. Paste the two lines over the empty `VITE_CONTRACT_ADDRESS=` and `VITE_DEPLOY_BLOCK=` lines and save with **Command + S**.
   - **Windows (Command Prompt):** press **Ctrl + C** to stop the app, run `if not exist .env copy .env.example .env`, then `notepad .env`. Paste, then save with **Ctrl + S**.
6. Restart with `npm run dev` and reload the page. The chip must now say **CONNECTED · BASE SEPOLIA (84532)**.
7. Your *Contract on BaseScan* link is `https://sepolia.basescan.org/address/` followed by the address.

### 3.3 Make the two real transactions

**Tx #1: Admin authorizes the issuer**
1. In MetaMask, copy **Account 2's** address, then switch back to **Account 1**.
2. In PaperSeal, click **Institution Admin**. It should say **Matches on-chain admin()**.
3. Paste Account 2's address into **Issuer wallet address**, click **Authorize issuer**, and confirm in MetaMask.
4. Wait for **On-chain proof receipt · Confirmed**, then click **Copy receipt**. It contains **Tx #1's hash and BaseScan link**.

**Tx #2: Issuer registers a certificate**
1. Click **Public Verifier**, then **Original sample (v1)** to download `CERT-2026-SYN-001-original.txt`.
2. Switch MetaMask to **Account 2** (click *Connect* if it says "not connected").
3. Click **Issuer Desk**. It should say **isAuthorizedIssuer = true** (click *Re-check role* if not).
4. Keep ID `CERT-2026-SYN-001` and label `B.Sc. Distributed Systems`. Drop the sample file onto the file box and click **Issue certificate (v1)**. Confirm in MetaMask.
5. Wait for **Confirmed**, then click **Copy receipt**. It contains **Tx #2's hash and BaseScan link**.

### 3.4 If you lost a receipt: find the hashes again

- **Both transactions:** click **Institution Admin** and scroll to **Recent contract events**. Click **Tx** next to **IssuerAuthorized** (that's Tx #1) or **CertificateIssued** (that's Tx #2). BaseScan opens. Copy the **Transaction Hash** and the page URL.
- **Tx #2 only:** in **Public Verifier**, look up `CERT-2026-SYN-001`. Under **Correction history**, click **Show proof receipt** on v1.
- **Check each link:** BaseScan must show **Status: Success** and network *Base Sepolia Testnet*.

### 3.5 Push to GitHub and get the repo link

1. On github.com, click **New** and create an **empty** repository called `paperseal`. Don't add a README, `.gitignore` or licence.
2. In Terminal (Mac) or Command Prompt (Windows), inside the `paperseal` folder, run these one at a time:
   ```bash
   git init -b main
   git add -A
   git commit -m "PaperSeal: blockchain certificate verification on Base Sepolia"
   git remote add origin https://github.com/AarushMalik316/PaperSeal.git
   git push -u origin main
   ```
   If it asks for a password, use a GitHub **personal access token** (GitHub, then Settings, then Developer settings, then Personal access tokens), not your account password. GitHub Desktop also works: *Add Existing Repository*, then *Publish*.
3. Your **Repo link** is `https://github.com/AarushMalik316/PaperSeal`. `.env` is git-ignored, so no secrets are uploaded.

### 3.6 Write the values into this README and the Project Note

1. **This README:** Section 1 is filled in with the live values and *Who did what*.
2. **`PROJECT_NOTE.md`:** scroll to **Live deployment on Base Sepolia** under *How to run the demo* and check the contract address, Tx #1 and Tx #2 match Section 1.
3. Save, then push the update:
   ```bash
   git add README.md PROJECT_NOTE.md
   git commit -m "Add Base Sepolia contract address and transaction hashes"
   git push
   ```

### 3.7 Fill in the Google form

| Google form field | Paste |
| --- | --- |
| Repo link | `https://github.com/AarushMalik316/PaperSeal` |
| Contract address | `0x46636E242Ff0d76321C1bB91f34380aCE92f5ff9` |
| Two transaction hashes + explorer link | Tx #1: `0x2889ba0efd46e20052b7f41690e7b34fbe9ec736fccbf8bc1ba1588196f9e7ac` (https://sepolia.basescan.org/tx/0x2889ba0efd46e20052b7f41690e7b34fbe9ec736fccbf8bc1ba1588196f9e7ac)<br>Tx #2: `0x5b80b009b0352176966c3556b5e60b058aa9f9b3c2f82b6d154354d248f16fad` (https://sepolia.basescan.org/tx/0x5b80b009b0352176966c3556b5e60b058aa9f9b3c2f82b6d154354d248f16fad) |
| One-page note | Copy the text of `PROJECT_NOTE.md`, or link to it in the repo |
| Who did what | One line per member, from Section 1 |

**Final check before submitting:** open the contract link and both transaction links in a private browser window. Each must load on **sepolia.basescan.org** and show **Success**.

---

## 4. Run it locally

You need **Node.js 18 or newer** (from nodejs.org, the LTS version) and **Google Chrome**.

**Mac (Terminal)**
```bash
cd ~/Downloads/paperseal
npm install
cp .env.example .env
npm run dev
```

**Windows (Command Prompt)**
```bat
cd %USERPROFILE%\Downloads\paperseal
npm install
if not exist .env copy .env.example .env
npm run dev
```

Open **http://localhost:5173** and click **Authenticate & Enter**. Leave the terminal open while you use the app; **Control/Ctrl + C** stops it.

- `npm install` prints *deprecated* and *vulnerabilities* warnings from developer tooling. They're harmless for this demo. **Don't run `npm audit fix --force`**.
- Without a contract address the app runs in **Unconfigured · Setup Required** mode. Every screen renders, but no certificate data is shown and nothing is presented as live.

---

## 5. Using the app

| Role | Needs | Screen | Can do |
| --- | --- | --- | --- |
| **Institution Admin** | The deployer wallet | *Institution Admin* | Authorize / deauthorize issuer wallets, see the live issuer list and recent contract events |
| **Authorized Issuer** | An authorized wallet | *Issuer Desk* | Issue v1, append corrections, revoke, copy proof receipts, run the unauthorized-action demonstration |
| **Public Verifier** | Nothing | *Public Verifier* | Look up a certificate (or scan its QR code), run the local tamper check, read the full correction history |

### The Clearance home screen

The home screen is the **PaperSeal Clearance Matrix**: a 3D carousel (Three.js r169 with ambient-occlusion post-processing) in a dark broadcast-control style.

- **Security gate.** Matte-black panels with a round window show the live carousel loading. **Authenticate & Enter** swings them open and moves the camera into Zone 01.
- **Six zones = six contract rules.** A credentialed figure steps onto each bay's RFID pad. The light bar and floor ring scan, then lock **emerald (ACCESS GRANTED)** or pulse **crimson behind a laser barrier (ACCESS DENIED)**.

| Zone | Contract rule | Verdict |
| --- | --- | --- |
| 01 Issuer Authorization | `authorizeIssuer`, admin only | Granted |
| 02 Certificate Issuance | `issueCertificate`, authorized issuer | Granted |
| 03 Public Verification | `getCertificateHistory`, anyone | Granted |
| 04 Unauthorized Write | reverts `NotAuthorizedIssuer` | Denied |
| 05 Overwrite Vault | reverts `CertificateAlreadyExists` / `CertificateIsRevoked` | Denied |
| 06 Correction Ledger | `correctCertificate`, appends v2 | Granted |

These verdicts explain the contract's written rules and are labelled that way; they are never shown as live chain results. The **Access Matrix** (top right) and each zone's **dossier** (click any object) add a live check of your connected wallet's real role, read from `admin()` and `isAuthorizedIssuer()`.

- **Controls:** scroll, drag or swipe (with inertia), or use Arrow / Space / Page keys. It snaps to the nearest zone after 0.85 s. Hover to inspect, click to open the dossier. Three-step zoom is at the bottom right.
- **Resilience:** without WebGL, or if 3D takes more than 10 s to start, the gate still opens onto a static 2D matrix. `prefers-reduced-motion` turns off swing, dolly, pulses and inertia.

---

## 6. Deploying to Base Sepolia: options

PaperSeal never asks for a private key or seed phrase.

- **Option A: from the app with MetaMask (recommended, key-free).** Use the Setup panel, then **Deploy CertificateRegistry** (step 3.2). The deploying wallet becomes the **admin**.
- **Option B: Remix.** Paste `contracts/CertificateRegistry.sol` into remix.ethereum.org. Compile with Solidity 0.8.24, optimizer on (200 runs), EVM `cancun`. Deploy with *Injected Provider – MetaMask* on Base Sepolia, then put the address and block into `.env`.
- **Option C: Hardhat CLI.** Put a throwaway, **testnet-only** key in your local, git-ignored `.env` as `DEPLOYER_PRIVATE_KEY`, then run `npm run deploy:base-sepolia`. Optional verification: set `BASESCAN_API_KEY` and run `npx hardhat verify --network baseSepolia <address>`.

### `.env` variables

| Variable | Purpose |
| --- | --- |
| `VITE_CONTRACT_ADDRESS` | Deployed `CertificateRegistry` address (required for live mode) |
| `VITE_DEPLOY_BLOCK` | Deployment block; event queries start there |
| `VITE_CHAIN_ID` | Defaults to `84532` (Base Sepolia). `31337` is for local development only |
| `VITE_RPC_URL` | Read RPC; defaults to `https://sepolia.base.org` |
| `VITE_PUBLIC_APP_URL` | Public URL encoded in the pass QR code (set it if judges will scan from a phone) |
| `VITE_INSTITUTION_NAME` | Synthetic display name (default *Northbridge Technical Institute*) |
| `BASE_SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `BASESCAN_API_KEY` | Optional, CLI deploy/verify only; never sent to the browser |

The app only shows **CONNECTED · BASE SEPOLIA (84532)** when the RPC answers on chain 84532 **and** contract code exists at the address. Otherwise it says exactly what is wrong.

---

## 7. Five-minute demo script

Before judging: the app is running, MetaMask is unlocked on Base Sepolia, Accounts 1 and 2 have test ETH, and the sample files are downloaded. Open **Judge Demo** (top right): its readiness check should be green.

| Time | Beat | What to do |
| --- | --- | --- |
| 0:00 | **Why** | Employers verify degrees by emailing registrars or trusting an editable spreadsheet. Rotate the Clearance carousel: each zone is a rule the contract enforces. |
| 0:30 | **Admin authorizes** | Institution Admin, paste Account 2, **Authorize issuer**, then **Confirmed** and the receipt *(Tx #1)* |
| 1:10 | **Issuer issues** | Account 2, Issuer Desk, `CERT-2026-SYN-001` plus the original sample, **Issue**, then **Confirmed** *(Tx #2)* |
| 1:50 | **Public verification** | Public Verifier, no wallet: **Verified · Current**. Flip the pass for the proof. |
| 2:20 | **Tamper check** | Original file gives **Fingerprint Match**; tampered file (one word changed) gives **Fingerprint Mismatch** |
| 2:50 | **Correction** | Append correction with the v2 sample. Now v2 is Current and v1 Superseded, and the original file shows **Superseded by Correction** |
| 3:40 | **Refusal, live** | Account 3, *Unauthorized-action demonstration*: the contract returns `NotAuthorizedIssuer(0x…)`. Optionally broadcast for a reverted tx. |
| 4:20 | **Close** | Open the Access Matrix: why this beats a spreadsheet, and the path to real life |

---

## 8. On-chain vs on the page

**On the blockchain** (`CertificateRegistry.sol`), per certificate an append-only list of versions keyed by
`certIdHash = keccak256(utf8(certId.trim().toUpperCase()))`, each with:
- `documentHash`: SHA-256 of the exact certificate file
- `issuer`, `issuedAt`, `blockNumber`
- `version` and `status` (Current / Superseded / Revoked)
- `note`: a short non-personal label or correction code

The contract also stores the `admin` wallet and the authorized-issuer list, and emits `IssuerAuthorized`, `IssuerDeauthorized`, `CertificateIssued`, `CertificateCorrected` and `CertificateRevoked` events.

**Only on the page:**
- The verifier's file fingerprint, computed with Web Crypto and never uploaded
- The verdict
- The QR code, the certificate pass and proof receipts
- The institution display name

**What the contract refuses:**

| Error | When |
| --- | --- |
| `NotAuthorizedIssuer(caller)` | A wallet that isn't authorized (never added, or later removed) tries to issue, correct or revoke |
| `NotAdmin()` | Anyone but the admin tries to change the issuer list |
| `CertificateAlreadyExists(certIdHash)` | A second "version 1" for an existing ID |
| `CertificateNotFound(certIdHash)` | Correcting or revoking an ID that doesn't exist |
| `CertificateIsRevoked(certIdHash)` | Any change to a revoked certificate |
| `InvalidInput(field)` | Zero hashes, a correction that keeps the same fingerprint, or a note that is empty or over 64 bytes |

---

## 9. Why not a shared spreadsheet?

| | Shared spreadsheet | PaperSeal |
| --- | --- | --- |
| Who can verify | Only people you grant access to | Anyone, independently, straight from the contract |
| Who can write | Any editor | Only admin-authorized wallets; the contract refuses others |
| Corrections | Cells are overwritten and the old value disappears | v2 is appended; v1 stays forever, marked Superseded |
| Tamper evidence | A PDF can be edited unnoticed | Changing one byte breaks the on-chain fingerprint match |
| Personal data | Names, IDs and grades in one shared file | Zero personal data on-chain |

---

## 10. Privacy, limits and path to real life

- Only `keccak256(certId)` and a SHA-256 file fingerprint are stored. **Hashes are not encryption.** Short or guessable IDs (like `CERT-2026-SYN-001`) can be brute-forced or linked. A real deployment would use high-entropy or salted IDs and keep names, student IDs, grades and the files **off-chain** in the institution's systems.
- A fingerprint match proves the file is byte-identical to what the issuer recorded. It does not prove the facts inside it are true. Re-saving or re-exporting a file changes its fingerprint.
- **In production**, the registrar would run the admin wallet (ideally a multisig) and keep personal data in its own records, publishing only fingerprints.
- All data in this repository is synthetic.

---

## 11. Tests, lint and build

```bash
npm run test:contracts    # Hardhat / Mocha contract tests (17)
npm run test:web          # Vitest frontend tests (17)
npm test                  # both
npm run typecheck         # tsc -b
npm run lint              # ESLint
npm run build             # production build into dist/
```

After editing the contract, run `npm run compile`. It recompiles and copies the ABI and bytecode into `src/lib/contract/CertificateRegistry.json`; a test fails if the two drift apart.

**Local development chain (optional, not Base Sepolia, does not count as proof):**
```bash
HARDHAT_MINE_FAILED_TX=1 npm run chain:local   # terminal 1
npm run deploy:local                           # terminal 2: prints the VITE_* lines
```

---

## 12. Troubleshooting

| You see | Do this |
| --- | --- |
| MetaMask shows $0 / no funds | Switch MetaMask to **Base Sepolia**, and change the Tokens filter from *All default networks* to Base Sepolia. Test ETH shows $0.00 in dollars; look at the ETH amount. |
| Clicking a button does nothing | Click the MetaMask **fox icon**; the request is often waiting there. Unlock MetaMask and turn off other wallet extensions. |
| Chip still says UNCONFIGURED | Check `.env` has `VITE_CONTRACT_ADDRESS=0x…` with no spaces and is saved. Stop with Control/Ctrl + C, run `npm run dev`, then reload. |
| `open` / `cp` not recognised | You're on Windows: use `notepad .env` and `copy .env.example .env` (step 3.2) |
| "Not enough test ETH" | Use the faucet again, or send some from Account 1 |
| "Switch to Base Sepolia" | Click it, or pick Base Sepolia in MetaMask (Chain ID 84532) |
| "No contract at address" | The address is mistyped or was deployed on another network |
| "RPC unreachable" | Network hiccup; wait and reload. This is not a verdict on any certificate. |
| `isAuthorizedIssuer = false` | MetaMask must be on Account 2, and Tx #1 must have authorized exactly that address |
| MetaMask: "likely to fail" | Expected only in the unauthorized-action demonstration |

---

## 13. Project layout and stack

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
public/samples/                     synthetic demo files (original, tampered, corrected v2)
docs/                               printable Base Sepolia setup guide (PDF)
PROJECT_NOTE.md                     one-page submission note
```

- **Contract:** Solidity 0.8.24, Hardhat 2 with `@nomicfoundation/hardhat-toolbox`, compiled with the pinned `solc` npm package (works offline).
- **Frontend:** Vite, React 18, TypeScript, Tailwind CSS v4, Three.js r169 (lazy-loaded), Motion, `lucide-react`, `ethers` v6, `qrcode-generator`, Space Grotesk and JetBrains Mono.
- The sample files are marked `-text` in `.gitattributes`, so their fingerprints never change on checkout.
