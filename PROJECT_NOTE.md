# PaperSeal — Project Note

HASH-IT-OUT 2026 · Track 1: Digital Identity · Blockchain-Based Certificate Verification System · Base Sepolia (Chain ID 84532)

## The user and their one task.

**An employer's hiring coordinator** receives a graduate's certificate file and must decide, in under a minute and without contacting the registrar, whether it is genuine, current, and unaltered. With PaperSeal they open the Public Verifier (or scan the QR code on the pass), enter the certificate ID, drop in the file, and get a clear answer: **Verified · Current**, **Superseded by Correction**, **Revoked**, **Fingerprint Mismatch** or **Not Found**. No wallet, no account. Behind them, the **Institution Admin** decides which staff wallets may issue, and an **Authorized Issuer** (registrar staff) issues and corrects certificates.

## On the blockchain.

`CertificateRegistry.sol` stores **zero personal data**. For each certificate it stores an append-only array of versions, keyed by `certIdHash = keccak256(utf8(certId.trim().toUpperCase()))`. Each version holds:

- `documentHash`: the SHA-256 fingerprint of the exact certificate file
- `issuer`: the authorized wallet that wrote it, plus `issuedAt` (timestamp) and `blockNumber`
- `version` (1, 2, 3…) and `status` (Current / Superseded / Revoked)
- `note`: a short non-personal label (e.g. "B.Sc. Distributed Systems") or correction code (e.g. "AWARD-DATE-CORRECTED")

The contract also stores the `admin` wallet (fixed at deployment) and the authorized-issuer list. It emits `IssuerAuthorized`, `IssuerDeauthorized`, `CertificateIssued`, `CertificateCorrected` and `CertificateRevoked` events.

## Only on the page.

- The SHA-256 of the verifier's file, computed **locally** with Web Crypto (`crypto.subtle.digest`). The file is never uploaded, stored or logged.
- The verdict, which combines the on-chain history with the local fingerprint. RPC or configuration errors are shown as **Unable to Check** / **Unconfigured**, never as an invalid certificate.
- The certificate pass, its QR code (which encodes a verifier link), proof receipts and the institution display name (from configuration).
- Names, student IDs and grades **do not exist anywhere** in PaperSeal. Every sample is synthetic (e.g. `CERT-2026-SYN-001`, "Synthetic Learner S-001", Northbridge Technical Institute).

## What the contract refuses.

1. **Any wallet that is not an authorized issuer** cannot issue, correct or revoke a certificate: `NotAuthorizedIssuer(caller)`. That includes wallets the admin has deauthorized, and the admin itself unless it has authorized itself.
2. **Anyone but the admin** cannot authorize or remove issuers: `NotAdmin()`.
3. **A second "version 1"** for an ID that already exists: `CertificateAlreadyExists(certIdHash)`. Changes must be appended as corrections.
4. **Correcting or revoking a certificate that does not exist**: `CertificateNotFound(certIdHash)`.
5. **Any change to a revoked certificate**: `CertificateIsRevoked(certIdHash)`.
6. **Empty or malformed input**: zero hashes, a "correction" that keeps the same fingerprint, or notes that are empty or over 64 bytes: `InvalidInput(field)`.

Nothing is ever edited or deleted. A correction marks the previous version Superseded and appends a new one.

## How to run the demo.

1. `npm install`, `cp .env.example .env`, then `npm run dev` and open http://localhost:5173.
2. Deploy the contract: **Setup → Deploy with MetaMask** (no private keys needed), or use Remix. Put `VITE_CONTRACT_ADDRESS` and `VITE_DEPLOY_BLOCK` in `.env` and restart. The banner must read **Connected · Base Sepolia (84532)**.
3. Click **Authenticate & Enter** on the security gate. The Clearance carousel shows the six contract rules as zones (four granted, two denied). Then open **Judge Demo** (top right): it runs a live readiness check and walks through the 8 beats below.

**5-minute presenter script**

1. *(0:00)* **Why:** employers verify degrees by emailing registrars or trusting an editable spreadsheet. Rotate the Clearance carousel: each zone is a rule the contract enforces.
2. *(0:30)* **Admin authorizes an issuer.** Institution Admin → paste the issuer wallet → Authorize. Wait for **Confirmed** and show the proof receipt. *(Tx #1)*
3. *(1:10)* **Issuer issues a certificate.** Switch MetaMask to the issuer → Issuer Desk → `CERT-2026-SYN-001`, drop `CERT-2026-SYN-001-original.txt` → Issue → **Confirmed**. *(Tx #2)*
4. *(1:50)* **Public verification, no wallet.** Public Verifier → `CERT-2026-SYN-001` → **Verified · Current**. Flip the pass for the proof.
5. *(2:20)* **Tamper check.** Drop the original file → **Fingerprint Match**. Drop the tampered file (one word changed) → **Fingerprint Mismatch**.
6. *(2:50)* **Correction.** Issuer Desk → Append correction with `CERT-2026-SYN-001-corrected-v2.txt`. The verifier shows v2 Current, v1 Superseded, and the original file now reports **Superseded by Correction**.
7. *(3:40)* **Refusal, live.** Switch to an unauthorized wallet → Unauthorized-action demonstration → Attempt. The contract returns `NotAuthorizedIssuer(0x…)`. Optionally broadcast with manual gas to get a reverted tx hash on BaseScan.
8. *(4:20)* **Close:** open the Access Matrix: why this beats a spreadsheet, and the path to real life (below).

**Live deployment on Base Sepolia** (real, confirmed transactions):

- Repository: https://github.com/AarushMalik316/PaperSeal
- Contract address: `0x15D43F62e4ce562C5c138C08c3e8261922B6Ae7f` → https://sepolia.basescan.org/address/0x15D43F62e4ce562C5c138C08c3e8261922B6Ae7f
- Tx #1 (Admin authorizes issuer wallet): `0x4770401f2e177e8def04036ea11ed7b0fc3f8a1820f698a270746b9624f679cb` → https://sepolia.basescan.org/tx/0x4770401f2e177e8def04036ea11ed7b0fc3f8a1820f698a270746b9624f679cb
- Tx #2 (Issuer registers CERT-2026-SYN-001): `0x22deaad9a95fb0f87855fdd7c1cf5bcb57d99996215297323913f06a885ec904` → https://sepolia.basescan.org/tx/0x22deaad9a95fb0f87855fdd7c1cf5bcb57d99996215297323913f06a885ec904

## Path to real life.

PaperSeal beats a shared spreadsheet because anyone can verify on their own, only wallets the admin approved can write (the contract enforces it, not a sharing setting), and corrections append instead of overwrite, so the history cannot be quietly rewritten. In production the registrar would run the admin wallet, ideally a multisig, and keep names, student IDs, grades and the certificate files in its own systems, publishing only fingerprints on-chain. Hashes of short, guessable identifiers can still be linked or brute-forced, so a real deployment would use high-entropy or salted certificate IDs and design the on-chain proof data carefully.
