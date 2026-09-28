// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AgriCredX
 * @dev Master contract for the AgriCredX MST Buildathon prototype.
 * Consolidates InvoiceRegistry, AttestationRegistry, FinancingPool, and RepaymentManager
 * logic into a single contract to ensure safety and simplify 24-hour MVP deployment,
 * while preserving all logical invariants.
 */
contract AgriCredX {
    
    // ============================================================
    // ENUMS & STRUCTS
    // ============================================================

    /**
     * @dev Canonical Lifecycle State Machine
     * FROZEN: CREATED → VERIFIED → BUYER_ACCEPTED → ATTESTED → FINANCEABLE
     * → FUNDED → OUTSTANDING → REPAID → CLOSED
     */
    enum ReceivableStatus {
        CREATED,
        VERIFIED,
        BUYER_ACCEPTED,
        ATTESTED,
        FINANCEABLE,
        FUNDED,
        OUTSTANDING,
        REPAID,
        CLOSED,
        DISPUTED
    }

    struct Receivable {
        string invoiceId;
        address supplier;
        address buyer;
        uint256 amount;
        uint256 dueDate;
        ReceivableStatus status;
        bytes32 attestationDigest;
        address financier;       // Set during funding
        uint256 fundedAmount;
    }

    // ============================================================
    // STATE
    // ============================================================

    uint256 public receivableCount;
    mapping(uint256 => Receivable) public receivables;

    // Authorized system roles
    address public admin;
    address public verifierNode; // AI Service Backend wallet

    // ============================================================
    // EVENTS
    // ============================================================

    event ReceivableCreated(uint256 indexed id, string invoiceId, address indexed supplier, address indexed buyer, uint256 amount, uint256 dueDate);
    event StatusUpdated(uint256 indexed id, ReceivableStatus oldStatus, ReceivableStatus newStatus);
    event AttestationAnchored(uint256 indexed id, bytes32 digest);
    event ReceivableFunded(uint256 indexed id, address indexed financier, uint256 fundedAmount);
    event ReceivableRepaid(uint256 indexed id, uint256 amount);

    // ============================================================
    // MODIFIERS
    // ============================================================

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier onlyVerifier() {
        require(msg.sender == verifierNode, "Not verifier node");
        _;
    }

    // ============================================================
    // CONSTRUCTOR
    // ============================================================

    constructor(address _verifierNode) {
        admin = msg.sender;
        verifierNode = _verifierNode;
    }

    // ============================================================
    // LIFECYCLE FUNCTIONS
    // ============================================================

    /**
     * @notice Step 1: Supplier creates a receivable
     */
    function createReceivable(string memory _invoiceId, address _buyer, uint256 _amount, uint256 _dueDate) external returns (uint256) {
        require(_buyer != address(0), "Invalid buyer address");
        require(_amount > 0, "Amount must be > 0");
        require(_dueDate > block.timestamp, "Due date must be in future");

        receivableCount++;
        uint256 newId = receivableCount;

        receivables[newId] = Receivable({
            invoiceId: _invoiceId,
            supplier: msg.sender,
            buyer: _buyer,
            amount: _amount,
            dueDate: _dueDate,
            status: ReceivableStatus.CREATED,
            attestationDigest: bytes32(0),
            financier: address(0),
            fundedAmount: 0
        });

        emit ReceivableCreated(newId, _invoiceId, msg.sender, _buyer, _amount, _dueDate);
        return newId;
    }

    /**
     * @notice Step 2: Off-chain AI verifies and sets state to VERIFIED
     */
    function setVerified(uint256 _id) external onlyVerifier {
        Receivable storage r = receivables[_id];
        require(r.status == ReceivableStatus.CREATED || r.status == ReceivableStatus.DISPUTED, "Invalid state transition");
        
        ReceivableStatus oldStatus = r.status;
        r.status = ReceivableStatus.VERIFIED;
        
        emit StatusUpdated(_id, oldStatus, r.status);
    }

    /**
     * @notice Step 3: Buyer reviews and explicitly accepts via wallet signature
     */
    function buyerAccept(uint256 _id) external {
        Receivable storage r = receivables[_id];
        require(msg.sender == r.buyer, "Not authorized buyer");
        require(r.status == ReceivableStatus.VERIFIED, "Must be VERIFIED first");

        r.status = ReceivableStatus.BUYER_ACCEPTED;
        emit StatusUpdated(_id, ReceivableStatus.VERIFIED, r.status);
    }

    /**
     * @notice Step 4: Attestation is anchored deterministically
     */
    function anchorAttestation(uint256 _id, bytes32 _digest) external onlyVerifier {
        Receivable storage r = receivables[_id];
        require(r.status == ReceivableStatus.BUYER_ACCEPTED, "Must be BUYER_ACCEPTED first");
        require(_digest != bytes32(0), "Invalid digest");

        r.attestationDigest = _digest;
        r.status = ReceivableStatus.ATTESTED;

        emit AttestationAnchored(_id, _digest);
        emit StatusUpdated(_id, ReceivableStatus.BUYER_ACCEPTED, r.status);
    }

    /**
     * @notice Step 5: System marks as financeable once all conditions are met
     */
    function makeFinanceable(uint256 _id) external onlyVerifier {
        Receivable storage r = receivables[_id];
        require(r.status == ReceivableStatus.ATTESTED, "Must be ATTESTED first");

        r.status = ReceivableStatus.FINANCEABLE;
        emit StatusUpdated(_id, ReceivableStatus.ATTESTED, r.status);
    }

    /**
     * @notice Step 6 & 7: Financier funds the receivable. State becomes FUNDED then OUTSTANDING
     */
    function fundReceivable(uint256 _id, uint256 _fundedAmount) external {
        Receivable storage r = receivables[_id];
        require(r.status == ReceivableStatus.FINANCEABLE, "Not financeable");
        require(_fundedAmount > 0 && _fundedAmount <= r.amount, "Invalid funding amount");

        r.financier = msg.sender;
        r.fundedAmount = _fundedAmount;
        r.status = ReceivableStatus.OUTSTANDING; // Skips FUNDED as intermediate to reduce tx count in MVP

        emit ReceivableFunded(_id, msg.sender, _fundedAmount);
        emit StatusUpdated(_id, ReceivableStatus.FINANCEABLE, r.status);
    }

    /**
     * @notice Step 8 & 9: Repayment is recorded, moving to REPAID then CLOSED
     */
    function markRepaid(uint256 _id) external {
        Receivable storage r = receivables[_id];
        // Only buyer or admin can trigger this in prototype
        require(msg.sender == r.buyer || msg.sender == admin, "Not authorized");
        require(r.status == ReceivableStatus.OUTSTANDING, "Not outstanding");

        r.status = ReceivableStatus.CLOSED; // Skips REPAID to reduce tx count in MVP

        emit ReceivableRepaid(_id, r.amount);
        emit StatusUpdated(_id, ReceivableStatus.OUTSTANDING, r.status);
    }

    /**
     * @notice Dispute mechanism
     */
    function dispute(uint256 _id) external {
        Receivable storage r = receivables[_id];
        require(msg.sender == r.buyer, "Only buyer can dispute");
        require(r.status == ReceivableStatus.VERIFIED || r.status == ReceivableStatus.BUYER_ACCEPTED, "Invalid state for dispute");

        ReceivableStatus old = r.status;
        r.status = ReceivableStatus.DISPUTED;
        
        emit StatusUpdated(_id, old, r.status);
    }
}
