// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title PaperSeal CertificateRegistry
/// @notice Append-only registry of educational certificate fingerprints for
///         HASH-IT-OUT 2026 Track 1 (Digital Identity) on Base Sepolia (84532).
/// @dev    ZERO personal data is stored here. A certificate is addressed only by
///         an opaque `certIdHash`:
///
///             certIdHash = keccak256(utf8Bytes(certId.trim().toUpperCase()))
///
///         (see `shared/canonical.js`, used by both the tests and the frontend).
///         Each version stores the SHA-256 fingerprint of the certificate file,
///         the issuer wallet, timestamps, a version number, a status flag and a
///         short non-PII synthetic code. Corrections and revocations APPEND a new
///         version; earlier versions are never edited or deleted (only their
///         status flag changes from Current to Superseded).
contract CertificateRegistry {
    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------

    enum Status {
        None, //       0 — never used for stored records
        Current, //    1 — the latest, valid version
        Superseded, // 2 — replaced by a later version (kept forever)
        Revoked //     3 — latest version, certificate withdrawn by issuer
    }

    struct VersionRecord {
        bytes32 documentHash; // SHA-256 of the exact certificate file bytes
        address issuer; //       authorized wallet that wrote this version
        uint64 issuedAt; //      block timestamp of this version
        uint64 blockNumber; //   block in which this version was written (for receipts)
        uint32 version; //       1, 2, 3, ...
        Status status; //        Current / Superseded / Revoked
        string note; //          v1: synthetic credential label; later: correction / revocation code
    }

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error NotAdmin();
    error NotAuthorizedIssuer(address caller);
    error CertificateAlreadyExists(bytes32 certIdHash);
    error CertificateNotFound(bytes32 certIdHash);
    error CertificateIsRevoked(bytes32 certIdHash);
    error InvalidInput(string field);

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event IssuerAuthorized(address indexed issuer, address indexed admin);
    event IssuerDeauthorized(address indexed issuer, address indexed admin);
    event CertificateIssued(
        bytes32 indexed certIdHash,
        address indexed issuer,
        bytes32 documentHash,
        uint32 version,
        string syntheticCode
    );
    event CertificateCorrected(
        bytes32 indexed certIdHash,
        address indexed issuer,
        bytes32 newDocumentHash,
        uint32 version,
        string correctionReason
    );
    event CertificateRevoked(bytes32 indexed certIdHash, address indexed issuer, uint32 version, string reasonCode);

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    uint256 public constant MAX_NOTE_BYTES = 64;

    /// @notice Institution admin wallet, fixed at deployment.
    address public immutable admin;

    mapping(address => bool) private _authorized;
    mapping(address => bool) private _known;
    address[] private _knownIssuers;

    mapping(bytes32 => VersionRecord[]) private _history;

    /// @notice Number of distinct certificates ever issued.
    uint256 public totalCertificates;

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyAuthorizedIssuer() {
        if (!_authorized[msg.sender]) revert NotAuthorizedIssuer(msg.sender);
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    // ---------------------------------------------------------------------
    // Admin: issuer permissions
    // ---------------------------------------------------------------------

    function authorizeIssuer(address issuer) external onlyAdmin {
        if (issuer == address(0)) revert InvalidInput("issuer");
        if (!_known[issuer]) {
            _known[issuer] = true;
            _knownIssuers.push(issuer);
        }
        _authorized[issuer] = true;
        emit IssuerAuthorized(issuer, msg.sender);
    }

    function deauthorizeIssuer(address issuer) external onlyAdmin {
        if (issuer == address(0)) revert InvalidInput("issuer");
        _authorized[issuer] = false;
        emit IssuerDeauthorized(issuer, msg.sender);
    }

    // ---------------------------------------------------------------------
    // Issuer: append-only certificate records
    // ---------------------------------------------------------------------

    /// @notice Register version 1 of a new certificate.
    function issueCertificate(bytes32 certIdHash, bytes32 documentHash, string calldata syntheticCode)
        external
        onlyAuthorizedIssuer
    {
        if (certIdHash == bytes32(0)) revert InvalidInput("certIdHash");
        if (documentHash == bytes32(0)) revert InvalidInput("documentHash");
        _checkNote(syntheticCode, "syntheticCode");
        if (_history[certIdHash].length != 0) revert CertificateAlreadyExists(certIdHash);

        _history[certIdHash].push(_record(documentHash, 1, Status.Current, syntheticCode));
        totalCertificates += 1;
        emit CertificateIssued(certIdHash, msg.sender, documentHash, 1, syntheticCode);
    }

    /// @notice Append a corrected version. The previous latest version is kept
    ///         and marked Superseded; nothing is edited or deleted.
    function correctCertificate(bytes32 certIdHash, bytes32 newDocumentHash, string calldata correctionReason)
        external
        onlyAuthorizedIssuer
    {
        if (newDocumentHash == bytes32(0)) revert InvalidInput("newDocumentHash");
        _checkNote(correctionReason, "correctionReason");
        VersionRecord[] storage versions = _history[certIdHash];
        uint256 count = versions.length;
        if (count == 0) revert CertificateNotFound(certIdHash);
        VersionRecord storage latest = versions[count - 1];
        if (latest.status == Status.Revoked) revert CertificateIsRevoked(certIdHash);
        if (latest.documentHash == newDocumentHash) revert InvalidInput("newDocumentHash");

        latest.status = Status.Superseded;
        uint32 next = uint32(count + 1);
        versions.push(_record(newDocumentHash, next, Status.Current, correctionReason));
        emit CertificateCorrected(certIdHash, msg.sender, newDocumentHash, next, correctionReason);
    }

    /// @notice Append a revocation version (same fingerprint, status Revoked).
    ///         A revoked certificate can no longer be corrected.
    function revokeCertificate(bytes32 certIdHash, string calldata reasonCode) external onlyAuthorizedIssuer {
        _checkNote(reasonCode, "reasonCode");
        VersionRecord[] storage versions = _history[certIdHash];
        uint256 count = versions.length;
        if (count == 0) revert CertificateNotFound(certIdHash);
        VersionRecord storage latest = versions[count - 1];
        if (latest.status == Status.Revoked) revert CertificateIsRevoked(certIdHash);

        latest.status = Status.Superseded;
        uint32 next = uint32(count + 1);
        versions.push(_record(latest.documentHash, next, Status.Revoked, reasonCode));
        emit CertificateRevoked(certIdHash, msg.sender, next, reasonCode);
    }

    // ---------------------------------------------------------------------
    // Public reads (no wallet needed)
    // ---------------------------------------------------------------------

    function isAuthorizedIssuer(address account) external view returns (bool) {
        return _authorized[account];
    }

    /// @notice All wallets that are currently authorized.
    function getAuthorizedIssuers() external view returns (address[] memory issuers) {
        uint256 n = _knownIssuers.length;
        uint256 active;
        for (uint256 i = 0; i < n; i++) {
            if (_authorized[_knownIssuers[i]]) active++;
        }
        issuers = new address[](active);
        uint256 j;
        for (uint256 i = 0; i < n; i++) {
            address a = _knownIssuers[i];
            if (_authorized[a]) issuers[j++] = a;
        }
    }

    function getVersionCount(bytes32 certIdHash) external view returns (uint256) {
        return _history[certIdHash].length;
    }

    function getLatestVersion(bytes32 certIdHash) external view returns (VersionRecord memory) {
        VersionRecord[] storage versions = _history[certIdHash];
        if (versions.length == 0) revert CertificateNotFound(certIdHash);
        return versions[versions.length - 1];
    }

    /// @notice Full append-only history, oldest first. Empty array if unknown.
    function getCertificateHistory(bytes32 certIdHash) external view returns (VersionRecord[] memory) {
        return _history[certIdHash];
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------

    function _record(bytes32 documentHash, uint32 version, Status status, string calldata note)
        private
        view
        returns (VersionRecord memory)
    {
        return VersionRecord({
            documentHash: documentHash,
            issuer: msg.sender,
            issuedAt: uint64(block.timestamp),
            blockNumber: uint64(block.number),
            version: version,
            status: status,
            note: note
        });
    }

    function _checkNote(string calldata note, string memory field) private pure {
        uint256 len = bytes(note).length;
        if (len == 0 || len > MAX_NOTE_BYTES) revert InvalidInput(field);
    }
}
