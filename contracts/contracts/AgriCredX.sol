// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgriCredX
 * @dev Master contract for the AgriCredX MST Buildathon prototype.
 * Upgraded to incorporate NFT-based certificates, Native MST Escrow, and On-chain Delivery.
 */
contract AgriCredX is ERC721URIStorage, Ownable {
    
    // ============================================================
    // ENUMS & STRUCTS
    // ============================================================

    /**
     * @dev Canonical Lifecycle State Machine
     * FROZEN: CREATED → DELIVERED → VERIFIED → BUYER_ACCEPTED → ATTESTED → FINANCEABLE
     * → FUNDED → OUTSTANDING → REPAID → CLOSED
     */
    enum ReceivableStatus {
        QUOTATION_SENT,          // 0: Supplier sends proposal
        BUYER_ACCEPTED,          // 1: Buyer accepts proposal & locks funds
        DOCUMENTATION_UPLOADED,  // 2: Supplier uploads invoice/docs, AI hashes
        PACKED,                  // 3: Logistics phase
        IN_TRANSIT,              // 4: Logistics phase
        DELIVERED,               // 5: Logistics phase -> Escrow payout
        VERIFIED,                // 6: (Legacy/Optional) 
        ATTESTED,                // 7: (Legacy/Optional)
        FINANCEABLE,             // 8: (Legacy/Optional)
        FUNDED,                  // 9: (Legacy/Optional)
        OUTSTANDING,             // 10: (Legacy/Optional)
        REPAID,                  // 11: (Legacy/Optional)
        CLOSED,                  // 12: End state
        DISPUTED                 // 13: Dispute state
    }

    struct Receivable {
        string invoiceId;
        address payable supplier;
        address buyer;
        uint256 amount;
        uint256 dueDate;
        ReceivableStatus status;
        bytes32 attestationDigest;
        address payable financier;
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
    event OrderDelivered(uint256 indexed id);

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

    constructor(address _verifierNode) ERC721("AgriCredX Certificate", "AGCX") Ownable(msg.sender) {
        admin = msg.sender;
        verifierNode = _verifierNode;
    }

    // ============================================================
    // LIFECYCLE FUNCTIONS
    // ============================================================

    /**
     * @notice Step 1: Supplier proposes a quotation to the Buyer
     */
    function createReceivable(string memory _invoiceId, address _buyer, uint256 _amount, uint256 _dueDate, string memory _tokenURI) external returns (uint256) {
        require(_buyer != address(0), "Invalid buyer address");
        require(_amount > 0, "Amount must be > 0");
        require(_dueDate > block.timestamp, "Due date must be in future");

        receivableCount++;
        uint256 newId = receivableCount;

        receivables[newId] = Receivable({
            invoiceId: _invoiceId,
            supplier: payable(msg.sender),
            buyer: _buyer,
            amount: _amount,
            dueDate: _dueDate,
            status: ReceivableStatus.QUOTATION_SENT,
            attestationDigest: bytes32(0),
            financier: payable(address(0)),
            fundedAmount: 0
        });

        // Mint NFT Certificate to the supplier
        _mint(msg.sender, newId);
        _setTokenURI(newId, _tokenURI);

        emit ReceivableCreated(newId, _invoiceId, msg.sender, _buyer, _amount, _dueDate);
        return newId;
    }

    /**
     * @notice Step 2: Buyer reviews quotation, explicitly accepts, and locks funds in Escrow
     */
    function buyerAccept(uint256 _id) external payable {
        Receivable storage r = receivables[_id];
        require(msg.sender == r.buyer, "Not authorized buyer");
        require(r.status == ReceivableStatus.QUOTATION_SENT, "Must be QUOTATION_SENT first");
        // In a real implementation with MSTC ERC20, we would transferFrom here.
        // For the native prototype, we'll just mock the requirement or accept msg.value if we want native escrow.

        r.status = ReceivableStatus.BUYER_ACCEPTED;
        emit StatusUpdated(_id, ReceivableStatus.QUOTATION_SENT, r.status);
    }

    /**
     * @notice Step 3: Supplier uploads documentation (Invoice/GRN) after buyer accepts. AI Hashes generated.
     */
    function uploadDocumentation(uint256 _id, bytes32 _digest) external {
        Receivable storage r = receivables[_id];
        require(msg.sender == r.supplier || msg.sender == verifierNode, "Not authorized");
        require(r.status == ReceivableStatus.BUYER_ACCEPTED, "Must be BUYER_ACCEPTED first");
        
        r.attestationDigest = _digest;
        r.status = ReceivableStatus.DOCUMENTATION_UPLOADED;
        
        emit AttestationAnchored(_id, _digest);
        emit StatusUpdated(_id, ReceivableStatus.BUYER_ACCEPTED, r.status);
    }

    /**
     * @notice Step 4: Supplier/Logistics marks order tracking status on-chain. Escrow releases on DELIVERED.
     */
    function updateLogisticsStatus(uint256 _id, ReceivableStatus _newStatus) external {
        Receivable storage r = receivables[_id];
        
        require(r.status == ReceivableStatus.DOCUMENTATION_UPLOADED || 
                r.status == ReceivableStatus.PACKED || 
                r.status == ReceivableStatus.IN_TRANSIT || 
                r.status == ReceivableStatus.DISPUTED, "Invalid state transition");
        
        require(_newStatus == ReceivableStatus.PACKED || 
                _newStatus == ReceivableStatus.IN_TRANSIT || 
                _newStatus == ReceivableStatus.DELIVERED, "Not a logistics status");

        ReceivableStatus oldStatus = r.status;
        r.status = _newStatus;
        
        if (_newStatus == ReceivableStatus.DELIVERED) {
            emit OrderDelivered(_id);
            // In a production system, Escrow pays Supplier here via transfer() of ERC20 MSTC.
        }
        emit StatusUpdated(_id, oldStatus, r.status);
    }

    /**
     * @notice Step 6 & 7: Financier funds the receivable. Escrow automatically pays supplier.
     */
    function fundReceivable(uint256 _id) external payable {
        Receivable storage r = receivables[_id];
        require(r.status == ReceivableStatus.FINANCEABLE, "Not financeable");
        require(msg.value > 0 && msg.value <= r.amount, "Invalid funding amount");

        r.financier = payable(msg.sender);
        r.fundedAmount = msg.value;
        r.status = ReceivableStatus.OUTSTANDING; 

        // Escrow transfer: Pay the supplier immediately
        (bool success, ) = r.supplier.call{value: msg.value}("");
        require(success, "Transfer to supplier failed");

        // The NFT certificate could optionally be transferred to the financier here
        // _transfer(r.supplier, r.financier, _id);

        emit ReceivableFunded(_id, msg.sender, msg.value);
        emit StatusUpdated(_id, ReceivableStatus.FINANCEABLE, r.status);
    }

    /**
     * @notice Step 8 & 9: Buyer repays. Escrow pays financier.
     */
    function markRepaid(uint256 _id) external payable {
        Receivable storage r = receivables[_id];
        require(r.status == ReceivableStatus.OUTSTANDING, "Not outstanding");
        require(msg.value >= r.amount, "Insufficient repayment");

        r.status = ReceivableStatus.CLOSED; 

        // Escrow transfer: Pay the financier their original funds + yield
        if (r.financier != address(0)) {
            (bool success, ) = r.financier.call{value: msg.value}("");
            require(success, "Transfer to financier failed");
        } else {
            // If no financier, pay supplier directly (if they held it)
            (bool success, ) = r.supplier.call{value: msg.value}("");
            require(success, "Transfer to supplier failed");
        }

        emit ReceivableRepaid(_id, msg.value);
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
