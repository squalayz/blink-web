// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title MishMeshVenture
 * @notice Factory + vault for MishMesh Ventures
 *         - Create ventures with multi-sig team wallets
 *         - Accept investments with 10% platform fee
 *         - Distribute revenue to team + investors proportionally
 *         - 2% platform cut on all revenue distributions
 */
contract MishMeshVenture is ReentrancyGuard {

    // ═══ STATE ═══

    address public platform;           // MishMesh treasury
    uint256 public constant CREATION_FEE = 0.01 ether;
    uint256 public constant MIN_INVESTMENT = 0.001 ether;
    uint256 public constant PLATFORM_INVEST_FEE_BPS = 1000;  // 10%
    uint256 public constant PLATFORM_REVENUE_FEE_BPS = 200;  // 2%

    struct Venture {
        bytes32 ventureId;             // Maps to Supabase UUID
        address founder;
        address[] teamMembers;
        uint256[] teamEquityBps;       // Basis points (10000 = 100%)
        uint256 totalInvested;
        uint256 totalRevenue;
        uint256 investorPoolBps;       // Total % allocated to investors
        bool active;
        uint256 createdAt;
    }

    struct Investment {
        address investor;
        uint256 amount;
        uint256 equityBps;             // Their share of the investor pool
        uint256 timestamp;
    }

    // ventureId => Venture
    mapping(bytes32 => Venture) public ventures;
    // ventureId => Investment[]
    mapping(bytes32 => Investment[]) public investments;
    // ventureId => investor => total invested
    mapping(bytes32 => mapping(address => uint256)) public investorTotals;

    uint256 public ventureCount;

    // ═══ EVENTS ═══

    event VentureCreated(bytes32 indexed ventureId, address indexed founder, uint256 timestamp);
    event TeamSet(bytes32 indexed ventureId, address[] members, uint256[] equityBps);
    event InvestmentReceived(bytes32 indexed ventureId, address indexed investor, uint256 amount, uint256 equityBps);
    event RevenueDistributed(bytes32 indexed ventureId, uint256 totalAmount, uint256 platformFee);
    event VentureDeactivated(bytes32 indexed ventureId);

    // ═══ MODIFIERS ═══

    modifier onlyPlatform() {
        require(msg.sender == platform, "Not platform");
        _;
    }

    modifier onlyFounder(bytes32 _vid) {
        require(ventures[_vid].founder == msg.sender, "Not founder");
        _;
    }

    modifier ventureExists(bytes32 _vid) {
        require(ventures[_vid].active, "Venture not active");
        _;
    }

    constructor() {
        platform = msg.sender;
    }

    // ═══ CREATE VENTURE ═══

    function createVenture(bytes32 _ventureId) external payable {
        require(msg.value >= CREATION_FEE, "Creation fee required");
        require(!ventures[_ventureId].active, "Already exists");

        Venture storage v = ventures[_ventureId];
        v.ventureId = _ventureId;
        v.founder = msg.sender;
        v.active = true;
        v.createdAt = block.timestamp;

        // Creation fee to platform
        (bool sent,) = platform.call{value: CREATION_FEE}("");
        require(sent, "Fee transfer failed");

        // Refund excess
        if (msg.value > CREATION_FEE) {
            (bool refund,) = msg.sender.call{value: msg.value - CREATION_FEE}("");
            require(refund, "Refund failed");
        }

        ventureCount++;
        emit VentureCreated(_ventureId, msg.sender, block.timestamp);
    }

    // ═══ SET TEAM (founder only, once) ═══

    function setTeam(
        bytes32 _ventureId,
        address[] calldata _members,
        uint256[] calldata _equityBps
    ) external onlyFounder(_ventureId) ventureExists(_ventureId) {
        require(_members.length == _equityBps.length, "Length mismatch");
        require(_members.length >= 2 && _members.length <= 6, "2-6 members");
        require(ventures[_ventureId].teamMembers.length == 0, "Team already set");

        uint256 totalBps;
        for (uint i = 0; i < _equityBps.length; i++) {
            totalBps += _equityBps[i];
        }
        // Team gets at most 80%, rest for investors
        require(totalBps <= 8000, "Team equity exceeds 80%");

        ventures[_ventureId].teamMembers = _members;
        ventures[_ventureId].teamEquityBps = _equityBps;
        ventures[_ventureId].investorPoolBps = 10000 - totalBps;

        emit TeamSet(_ventureId, _members, _equityBps);
    }

    // ═══ INVEST ═══

    function invest(bytes32 _ventureId) external payable ventureExists(_ventureId) nonReentrant {
        require(msg.value >= MIN_INVESTMENT, "Below minimum");
        require(ventures[_ventureId].investorPoolBps > 0, "No investor allocation");

        // 10% platform fee
        uint256 fee = (msg.value * PLATFORM_INVEST_FEE_BPS) / 10000;
        uint256 netInvestment = msg.value - fee;

        // Send fee to platform
        (bool feeSent,) = platform.call{value: fee}("");
        require(feeSent, "Fee failed");

        // Calculate equity share within investor pool
        Venture storage v = ventures[_ventureId];
        uint256 totalAfter = v.totalInvested + netInvestment;

        // Their share of the investor pool, proportional to investment
        uint256 equityBps;
        if (v.totalInvested == 0) {
            equityBps = v.investorPoolBps;
        } else {
            equityBps = (netInvestment * v.investorPoolBps) / totalAfter;
            // Dilute existing investors proportionally
            for (uint i = 0; i < investments[_ventureId].length; i++) {
                investments[_ventureId][i].equityBps =
                    (investments[_ventureId][i].amount * v.investorPoolBps) / totalAfter;
            }
        }

        investments[_ventureId].push(Investment({
            investor: msg.sender,
            amount: netInvestment,
            equityBps: equityBps,
            timestamp: block.timestamp
        }));

        investorTotals[_ventureId][msg.sender] += netInvestment;
        v.totalInvested = totalAfter;

        emit InvestmentReceived(_ventureId, msg.sender, netInvestment, equityBps);
    }

    // ═══ DISTRIBUTE REVENUE ═══

    function distributeRevenue(bytes32 _ventureId) external payable ventureExists(_ventureId) nonReentrant {
        require(msg.value > 0, "No revenue");

        Venture storage v = ventures[_ventureId];
        uint256 total = msg.value;

        // 2% platform fee on revenue
        uint256 platformFee = (total * PLATFORM_REVENUE_FEE_BPS) / 10000;
        (bool pfSent,) = platform.call{value: platformFee}("");
        require(pfSent, "Platform fee failed");

        uint256 distributable = total - platformFee;

        // Distribute to team members
        for (uint i = 0; i < v.teamMembers.length; i++) {
            uint256 share = (distributable * v.teamEquityBps[i]) / 10000;
            if (share > 0) {
                (bool sent,) = v.teamMembers[i].call{value: share}("");
                require(sent, "Team distribution failed");
            }
        }

        // Distribute to investors
        for (uint i = 0; i < investments[_ventureId].length; i++) {
            uint256 share = (distributable * investments[_ventureId][i].equityBps) / 10000;
            if (share > 0) {
                (bool sent,) = investments[_ventureId][i].investor.call{value: share}("");
                require(sent, "Investor distribution failed");
            }
        }

        v.totalRevenue += total;
        emit RevenueDistributed(_ventureId, total, platformFee);
    }

    // ═══ VIEWS ═══

    function getTeam(bytes32 _vid) external view returns (address[] memory, uint256[] memory) {
        return (ventures[_vid].teamMembers, ventures[_vid].teamEquityBps);
    }

    function getInvestmentCount(bytes32 _vid) external view returns (uint256) {
        return investments[_vid].length;
    }

    function getInvestment(bytes32 _vid, uint256 _idx) external view returns (Investment memory) {
        return investments[_vid][_idx];
    }

    // ═══ ADMIN ═══

    function deactivateVenture(bytes32 _vid) external onlyFounder(_vid) {
        ventures[_vid].active = false;
        emit VentureDeactivated(_vid);
    }

    function updatePlatform(address _new) external onlyPlatform {
        platform = _new;
    }

    receive() external payable {}
}
