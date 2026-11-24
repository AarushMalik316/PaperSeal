// Contract tests for PaperSeal's CertificateRegistry.
// Synthetic data only — no real names, IDs or grades.
import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers.js";
import { certIdHash, normalizeCertId } from "../shared/canonical.js";

const { ethers } = hre;

const CERT_ID = "CERT-2026-SYN-001";
const CERT = certIdHash(CERT_ID);
const DOC_V1 = ethers.sha256(ethers.toUtf8Bytes("synthetic certificate v1"));
const DOC_V2 = ethers.sha256(ethers.toUtf8Bytes("synthetic certificate v2 (corrected)"));
const LABEL = "B.Sc. Distributed Systems";

const Status = { None: 0n, Current: 1n, Superseded: 2n, Revoked: 3n };

async function deployFixture() {
  const [admin, issuer, outsider, secondIssuer] = await ethers.getSigners();
  const registry = await ethers.deployContract("CertificateRegistry", admin);
  await registry.waitForDeployment();
  return { registry, admin, issuer, outsider, secondIssuer };
}

async function withIssuerFixture() {
  const ctx = await deployFixture();
  await ctx.registry.connect(ctx.admin).authorizeIssuer(ctx.issuer.address);
  return ctx;
}

async function withCertificateFixture() {
  const ctx = await withIssuerFixture();
  await ctx.registry.connect(ctx.issuer).issueCertificate(CERT, DOC_V1, LABEL);
  return ctx;
}

describe("canonical certificate ID helper", () => {
  it("trims and upper-cases before hashing", () => {
    expect(normalizeCertId("  cert-2026-syn-001 ")).to.equal(CERT_ID);
    expect(certIdHash("  cert-2026-syn-001 ")).to.equal(CERT);
    expect(CERT).to.equal(ethers.keccak256(ethers.toUtf8Bytes(CERT_ID)));
  });
});

describe("CertificateRegistry", () => {
  describe("1. admin manages issuer wallets", () => {
    it("sets the deployer as admin", async () => {
      const { registry, admin } = await loadFixture(deployFixture);
      expect(await registry.admin()).to.equal(admin.address);
    });

    it("authorizes and deauthorizes an issuer, emitting events", async () => {
      const { registry, admin, issuer } = await loadFixture(deployFixture);

      await expect(registry.connect(admin).authorizeIssuer(issuer.address))
        .to.emit(registry, "IssuerAuthorized")
        .withArgs(issuer.address, admin.address);
      expect(await registry.isAuthorizedIssuer(issuer.address)).to.equal(true);
      expect(await registry.getAuthorizedIssuers()).to.deep.equal([issuer.address]);

      await expect(registry.connect(admin).deauthorizeIssuer(issuer.address))
        .to.emit(registry, "IssuerDeauthorized")
        .withArgs(issuer.address, admin.address);
      expect(await registry.isAuthorizedIssuer(issuer.address)).to.equal(false);
      expect(await registry.getAuthorizedIssuers()).to.deep.equal([]);
    });

    it("lists only currently authorized issuers without duplicates", async () => {
      const { registry, admin, issuer, secondIssuer } = await loadFixture(deployFixture);
      await registry.connect(admin).authorizeIssuer(issuer.address);
      await registry.connect(admin).authorizeIssuer(secondIssuer.address);
      await registry.connect(admin).deauthorizeIssuer(issuer.address);
      await registry.connect(admin).authorizeIssuer(issuer.address);
      expect(await registry.getAuthorizedIssuers()).to.deep.equal([issuer.address, secondIssuer.address]);
    });

    it("rejects non-admin callers with NotAdmin", async () => {
      const { registry, outsider, issuer } = await loadFixture(deployFixture);
      await expect(registry.connect(outsider).authorizeIssuer(issuer.address)).to.be.revertedWithCustomError(
        registry,
        "NotAdmin",
      );
      await expect(registry.connect(outsider).deauthorizeIssuer(issuer.address)).to.be.revertedWithCustomError(
        registry,
        "NotAdmin",
      );
    });

    it("rejects the zero address", async () => {
      const { registry, admin } = await loadFixture(deployFixture);
      await expect(registry.connect(admin).authorizeIssuer(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(registry, "InvalidInput")
        .withArgs("issuer");
    });
  });

  describe("2. authorized issuer registers a certificate (v1)", () => {
    it("stores only hashes, issuer, timestamps, version, status and the synthetic code", async () => {
      const { registry, issuer } = await loadFixture(withIssuerFixture);

      const tx = registry.connect(issuer).issueCertificate(CERT, DOC_V1, LABEL);
      await expect(tx).to.emit(registry, "CertificateIssued").withArgs(CERT, issuer.address, DOC_V1, 1, LABEL);
      const receipt = await (await tx).wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      expect(await registry.getVersionCount(CERT)).to.equal(1n);
      expect(await registry.totalCertificates()).to.equal(1n);
      const latest = await registry.getLatestVersion(CERT);
      expect(latest.documentHash).to.equal(DOC_V1);
      expect(latest.issuer).to.equal(issuer.address);
      expect(latest.version).to.equal(1n);
      expect(latest.status).to.equal(Status.Current);
      expect(latest.note).to.equal(LABEL);
      expect(latest.issuedAt).to.equal(BigInt(block.timestamp));
      expect(latest.blockNumber).to.equal(BigInt(receipt.blockNumber));
    });

    it("rejects empty hashes and empty / oversized codes with InvalidInput", async () => {
      const { registry, issuer } = await loadFixture(withIssuerFixture);
      const reg = registry.connect(issuer);
      await expect(reg.issueCertificate(ethers.ZeroHash, DOC_V1, LABEL))
        .to.be.revertedWithCustomError(registry, "InvalidInput")
        .withArgs("certIdHash");
      await expect(reg.issueCertificate(CERT, ethers.ZeroHash, LABEL))
        .to.be.revertedWithCustomError(registry, "InvalidInput")
        .withArgs("documentHash");
      await expect(reg.issueCertificate(CERT, DOC_V1, ""))
        .to.be.revertedWithCustomError(registry, "InvalidInput")
        .withArgs("syntheticCode");
      await expect(reg.issueCertificate(CERT, DOC_V1, "x".repeat(65)))
        .to.be.revertedWithCustomError(registry, "InvalidInput")
        .withArgs("syntheticCode");
    });

    it("returns an empty history and reverts getLatestVersion for unknown certificates", async () => {
      const { registry } = await loadFixture(deployFixture);
      const unknown = certIdHash("CERT-2026-SYN-404");
      expect(await registry.getCertificateHistory(unknown)).to.deep.equal([]);
      await expect(registry.getLatestVersion(unknown))
        .to.be.revertedWithCustomError(registry, "CertificateNotFound")
        .withArgs(unknown);
    });
  });

  describe("3. duplicate initial registration", () => {
    it("reverts with CertificateAlreadyExists, even for a differently-cased ID", async () => {
      const { registry, issuer, admin, secondIssuer } = await loadFixture(withCertificateFixture);
      await expect(registry.connect(issuer).issueCertificate(CERT, DOC_V2, LABEL))
        .to.be.revertedWithCustomError(registry, "CertificateAlreadyExists")
        .withArgs(CERT);

      await registry.connect(admin).authorizeIssuer(secondIssuer.address);
      await expect(registry.connect(secondIssuer).issueCertificate(certIdHash(" cert-2026-syn-001"), DOC_V2, LABEL))
        .to.be.revertedWithCustomError(registry, "CertificateAlreadyExists")
        .withArgs(CERT);
      expect(await registry.getVersionCount(CERT)).to.equal(1n);
    });
  });

  describe("4. corrections append a new version", () => {
    it("appends v2 as Current and keeps v1 intact as Superseded", async () => {
      const { registry, issuer } = await loadFixture(withCertificateFixture);
      const before = await registry.getCertificateHistory(CERT);

      await expect(registry.connect(issuer).correctCertificate(CERT, DOC_V2, "AWARD-DATE-FIX"))
        .to.emit(registry, "CertificateCorrected")
        .withArgs(CERT, issuer.address, DOC_V2, 2, "AWARD-DATE-FIX");

      const history = await registry.getCertificateHistory(CERT);
      expect(history.length).to.equal(2);

      // v1 data unchanged; only its status flag moved to Superseded.
      expect(history[0].documentHash).to.equal(before[0].documentHash);
      expect(history[0].issuer).to.equal(before[0].issuer);
      expect(history[0].issuedAt).to.equal(before[0].issuedAt);
      expect(history[0].note).to.equal(LABEL);
      expect(history[0].version).to.equal(1n);
      expect(history[0].status).to.equal(Status.Superseded);

      expect(history[1].documentHash).to.equal(DOC_V2);
      expect(history[1].version).to.equal(2n);
      expect(history[1].status).to.equal(Status.Current);
      expect((await registry.getLatestVersion(CERT)).version).to.equal(2n);
    });

    it("reverts CertificateNotFound for unknown IDs and rejects no-op corrections", async () => {
      const { registry, issuer } = await loadFixture(withCertificateFixture);
      const unknown = certIdHash("CERT-2026-SYN-999");
      await expect(registry.connect(issuer).correctCertificate(unknown, DOC_V2, "FIX"))
        .to.be.revertedWithCustomError(registry, "CertificateNotFound")
        .withArgs(unknown);
      await expect(registry.connect(issuer).correctCertificate(CERT, DOC_V1, "SAME-FILE"))
        .to.be.revertedWithCustomError(registry, "InvalidInput")
        .withArgs("newDocumentHash");
    });

    it("revocation appends a Revoked version and blocks further corrections", async () => {
      const { registry, issuer } = await loadFixture(withCertificateFixture);
      await expect(registry.connect(issuer).revokeCertificate(CERT, "ISSUED-IN-ERROR"))
        .to.emit(registry, "CertificateRevoked")
        .withArgs(CERT, issuer.address, 2, "ISSUED-IN-ERROR");

      const history = await registry.getCertificateHistory(CERT);
      expect(history.map((v) => v.status)).to.deep.equal([Status.Superseded, Status.Revoked]);
      expect(history[1].documentHash).to.equal(DOC_V1);

      await expect(registry.connect(issuer).correctCertificate(CERT, DOC_V2, "FIX"))
        .to.be.revertedWithCustomError(registry, "CertificateIsRevoked")
        .withArgs(CERT);
      await expect(registry.connect(issuer).revokeCertificate(CERT, "AGAIN"))
        .to.be.revertedWithCustomError(registry, "CertificateIsRevoked")
        .withArgs(CERT);
    });
  });

  describe("5. unauthorized wallets are rejected by the contract", () => {
    it("rejects a never-authorized wallet on issue, correct and revoke", async () => {
      const { registry, outsider } = await loadFixture(withCertificateFixture);
      const reg = registry.connect(outsider);
      await expect(reg.issueCertificate(certIdHash("CERT-2026-SYN-002"), DOC_V1, LABEL))
        .to.be.revertedWithCustomError(registry, "NotAuthorizedIssuer")
        .withArgs(outsider.address);
      await expect(reg.correctCertificate(CERT, DOC_V2, "FORGED"))
        .to.be.revertedWithCustomError(registry, "NotAuthorizedIssuer")
        .withArgs(outsider.address);
      await expect(reg.revokeCertificate(CERT, "FORGED"))
        .to.be.revertedWithCustomError(registry, "NotAuthorizedIssuer")
        .withArgs(outsider.address);
    });

    it("rejects a deauthorized wallet on issue and correct", async () => {
      const { registry, admin, issuer } = await loadFixture(withCertificateFixture);
      await registry.connect(admin).deauthorizeIssuer(issuer.address);
      const reg = registry.connect(issuer);
      await expect(reg.issueCertificate(certIdHash("CERT-2026-SYN-003"), DOC_V1, LABEL))
        .to.be.revertedWithCustomError(registry, "NotAuthorizedIssuer")
        .withArgs(issuer.address);
      await expect(reg.correctCertificate(CERT, DOC_V2, "LATE-FIX"))
        .to.be.revertedWithCustomError(registry, "NotAuthorizedIssuer")
        .withArgs(issuer.address);
    });

    it("the admin is not an issuer unless it authorizes itself", async () => {
      const { registry, admin } = await loadFixture(deployFixture);
      await expect(registry.connect(admin).issueCertificate(CERT, DOC_V1, LABEL))
        .to.be.revertedWithCustomError(registry, "NotAuthorizedIssuer")
        .withArgs(admin.address);
    });

    it("a reverted transaction mined with a manual gas limit leaves state unchanged", async () => {
      const { registry, outsider } = await loadFixture(withCertificateFixture);
      // A manual gas limit skips the pre-flight gas estimate, so the transaction
      // is actually mined and reverts inside the EVM (status 0).
      await expect(
        registry.connect(outsider).correctCertificate(CERT, DOC_V2, "FORGED", { gasLimit: 200_000 }),
      )
        .to.be.revertedWithCustomError(registry, "NotAuthorizedIssuer")
        .withArgs(outsider.address);
      const block = await ethers.provider.getBlock("latest");
      const receipt = await ethers.provider.getTransactionReceipt(block.transactions[0]);
      expect(receipt.status).to.equal(0);
      expect(receipt.from).to.equal(outsider.address);
      expect(await registry.getVersionCount(CERT)).to.equal(1n);
    });
  });
});
