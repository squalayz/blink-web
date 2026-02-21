// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./AgentToken.sol";
import "./BondingCurve.sol";

/**
 * @title TokenLauncher
 * @notice Factory for launching Agent Tokens from Fusions
 *         propose() → fund() × 2 → auto-deploy
 *         30% each founder, 40% to bonding curve
 *         cancel() refunds deposited ETH
 *
 *   FIXED DEPLOY ORDER:
 *     1. Deploy BondingCurve with token=address(0)
 *     2. Deploy AgentToken minting 40% to curve address
 *     3. curve.initialize(token) to link them
 *     4. curve.seed{value: totalETH}() to activate
 */
contract TokenLauncher is ReentrancyGuard {
    address public platform;

    uint256 public constant TOTAL_SUPPLY = 1_000_000;
    uint256 public constant FOUNDER_SHARE = 300_000;
    uint256 public constant CURVE_SHARE = 400_000;
    uint256 public constant MIN_FUND = 0.001 ether;

    struct Launch {
        bytes32 launchId;
        bytes32 fusionId;
        string name;
        string symbol;
        address founderA;
        address founderB;
        uint256 fundedA;
        uint256 fundedB;
        bool aFunded;
        bool bFunded;
        address tokenAddress;
        address curveAddress;
        bool deployed;
        bool cancelled;
        uint256 createdAt;
    }

    mapping(bytes32 => Launch) public launches;
    mapping(bytes32 => bytes32) public fusionLaunch;
    uint256 public launchCount;

    event LaunchProposed(bytes32 indexed launchId, bytes32 indexed fusionId, address founderA, address founderB);
    event LaunchFunded(bytes32 indexed launchId, address indexed founder, uint256 amount);
    event TokenDeployed(bytes32 indexed launchId, address tokenAddress, address curveAddress, uint256 totalLiquidity);
    event LaunchCancelled(bytes32 indexed launchId);

    constructor() {
        platform = msg.sender;
    }

    function propose(
        bytes32 _fusionId, string calldata _name, string calldata _symbol,
        address _founderA, address _founderB
    ) external returns (bytes32 launchId) {
        require(fusionLaunch[_fusionId] == bytes32(0), "Fusion already has token");
        require(_founderA != address(0) && _founderB != address(0), "Zero address");
        require(_founderA != _founderB, "Same founder");
        require(msg.sender == _founderA || msg.sender == _founderB, "Not founder");
        require(bytes(_name).length > 0 && bytes(_name).length <= 50, "Name length");
        require(bytes(_symbol).length > 0 && bytes(_symbol).length <= 6, "Symbol length");

        launchId = keccak256(abi.encodePacked(_fusionId, block.timestamp, launchCount));
        launchCount++;

        launches[launchId] = Launch({
            launchId: launchId, fusionId: _fusionId, name: _name, symbol: _symbol,
            founderA: _founderA, founderB: _founderB,
            fundedA: 0, fundedB: 0, aFunded: false, bFunded: false,
            tokenAddress: address(0), curveAddress: address(0),
            deployed: false, cancelled: false, createdAt: block.timestamp
        });

        fusionLaunch[_fusionId] = launchId;
        emit LaunchProposed(launchId, _fusionId, _founderA, _founderB);
    }

    function fund(bytes32 _launchId) external payable nonReentrant {
        Launch storage l = launches[_launchId];
        require(l.createdAt > 0, "Not found");
        require(!l.cancelled && !l.deployed, "Invalid state");
        require(msg.value >= MIN_FUND, "Min 0.001 ETH");

        if (msg.sender == l.founderA) {
            require(!l.aFunded, "A already funded");
            l.fundedA = msg.value;
            l.aFunded = true;
        } else if (msg.sender == l.founderB) {
            require(!l.bFunded, "B already funded");
            l.fundedB = msg.value;
            l.bFunded = true;
        } else {
            revert("Not founder");
        }

        emit LaunchFunded(_launchId, msg.sender, msg.value);

        if (l.aFunded && l.bFunded) {
            _deploy(_launchId);
        }
    }

    function _deploy(bytes32 _launchId) internal {
        Launch storage l = launches[_launchId];
        uint256 totalLiquidity = l.fundedA + l.fundedB;

        // 1. Deploy BondingCurve (token not yet known)
        BondingCurve curve = new BondingCurve(address(0), platform, _launchId);

        // 2. Deploy AgentToken (mints 40% to curve address)
        AgentToken tkn = new AgentToken(
            l.name, l.symbol, l.fusionId,
            l.founderA, l.founderB, address(curve),
            FOUNDER_SHARE, CURVE_SHARE
        );

        // 3. Link curve to token
        curve.initialize(address(tkn));

        // 4. Seed curve with combined ETH
        curve.seed{value: totalLiquidity}();

        l.tokenAddress = address(tkn);
        l.curveAddress = address(curve);
        l.deployed = true;

        emit TokenDeployed(_launchId, address(tkn), address(curve), totalLiquidity);
    }

    function cancel(bytes32 _launchId) external nonReentrant {
        Launch storage l = launches[_launchId];
        require(l.createdAt > 0, "Not found");
        require(!l.cancelled && !l.deployed, "Invalid state");
        require(msg.sender == l.founderA || msg.sender == l.founderB, "Not founder");

        l.cancelled = true;
        fusionLaunch[l.fusionId] = bytes32(0);

        // Refund (CEI pattern: clear state before transfers)
        uint256 refundA = l.fundedA;
        uint256 refundB = l.fundedB;
        l.fundedA = 0;
        l.fundedB = 0;
        l.aFunded = false;
        l.bFunded = false;

        if (refundA > 0) {
            (bool sent,) = l.founderA.call{value: refundA}("");
            require(sent, "Refund A failed");
        }
        if (refundB > 0) {
            (bool sent,) = l.founderB.call{value: refundB}("");
            require(sent, "Refund B failed");
        }

        emit LaunchCancelled(_launchId);
    }

    function getLaunch(bytes32 _launchId) external view returns (Launch memory) {
        return launches[_launchId];
    }

    function getFusionToken(bytes32 _fusionId) external view returns (bytes32) {
        return fusionLaunch[_fusionId];
    }

    function updatePlatform(address _new) external {
        require(msg.sender == platform && _new != address(0));
        platform = _new;
    }

    receive() external payable {}
}
