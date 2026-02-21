// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title BondingCurve
 * @notice Bancor-style bonding curve for Agent Tokens
 *         Price formula: P = reserveETH / (tokenSupply * reserveRatio)
 *         reserveRatio = 50% for moderate curve
 *         1% trade fee → platform wallet
 *
 *   DEPLOY PATTERN (2-step):
 *     1. Deploy with token=address(0) via TokenLauncher
 *     2. Call initialize(tokenAddress) once token is deployed
 *     3. Call seed() with initial ETH liquidity
 */
contract BondingCurve is ReentrancyGuard {
    IERC20 public token;
    address public launcher;   // Only launcher can initialize
    address public platform;
    bytes32 public launchId;

    uint256 public reserveBalance;
    uint256 public tokenBalance;
    uint256 public totalTokensSold;
    uint256 public totalVolume;

    uint256 public constant RESERVE_RATIO = 500000; // 50% in ppm
    uint256 public constant TRADE_FEE_BPS = 100;    // 1%
    uint256 public constant PPM = 1000000;

    bool public initialized;
    bool public seeded;
    bool public active;

    event TokenBought(address indexed buyer, uint256 tokenAmount, uint256 ethSpent, uint256 newPrice);
    event TokenSold(address indexed seller, uint256 tokenAmount, uint256 ethReceived, uint256 newPrice);

    modifier onlyActive() {
        require(active, "Curve not active");
        _;
    }

    constructor(
        address _token,  // Can be address(0) for 2-step deploy
        address _platform,
        bytes32 _launchId
    ) {
        launcher = msg.sender;
        platform = _platform;
        launchId = _launchId;

        if (_token != address(0)) {
            token = IERC20(_token);
            initialized = true;
        }
    }

    /// @notice Set token address (called by launcher after token deploy)
    function initialize(address _token) external {
        require(msg.sender == launcher, "Only launcher");
        require(!initialized, "Already initialized");
        require(_token != address(0), "Zero address");
        token = IERC20(_token);
        initialized = true;
    }

    /// @notice Seed the curve with initial ETH liquidity (called once)
    function seed() external payable {
        require(initialized, "Not initialized");
        require(!seeded, "Already seeded");
        require(msg.value > 0, "Need ETH");
        reserveBalance = msg.value;
        tokenBalance = token.balanceOf(address(this));
        require(tokenBalance > 0, "No tokens in curve");
        seeded = true;
        active = true;
    }

    /// @notice Buy tokens from the curve
    function buy(uint256 _minTokens) external payable nonReentrant onlyActive {
        require(msg.value > 0, "Send ETH");

        uint256 fee = (msg.value * TRADE_FEE_BPS) / 10000;
        uint256 netETH = msg.value - fee;

        // Send fee to platform
        _sendETH(platform, fee);

        // Calculate tokens out (Bancor)
        uint256 tokensOut = _calculateBuy(netETH);
        require(tokensOut >= _minTokens, "Slippage exceeded");
        require(tokensOut <= tokenBalance, "Insufficient curve supply");
        require(tokensOut > 0, "Zero tokens");

        reserveBalance += netETH;
        tokenBalance -= tokensOut;
        totalTokensSold += tokensOut;
        totalVolume += msg.value;

        require(token.transfer(msg.sender, tokensOut), "Transfer failed");
        emit TokenBought(msg.sender, tokensOut, msg.value, getCurrentPrice());
    }

    /// @notice Sell tokens back to the curve
    function sell(uint256 _tokenAmount, uint256 _minETH) external nonReentrant onlyActive {
        require(_tokenAmount > 0, "Zero amount");
        require(token.balanceOf(msg.sender) >= _tokenAmount, "Insufficient balance");

        uint256 ethOut = _calculateSell(_tokenAmount);
        require(ethOut > 0, "Zero ETH out");
        require(ethOut <= reserveBalance, "Insufficient reserve");

        uint256 fee = (ethOut * TRADE_FEE_BPS) / 10000;
        uint256 netETH = ethOut - fee;
        require(netETH >= _minETH, "Slippage exceeded");

        // Pull tokens first (checks-effects-interactions)
        require(token.transferFrom(msg.sender, address(this), _tokenAmount), "Transfer failed");

        reserveBalance -= ethOut;
        tokenBalance += _tokenAmount;
        totalTokensSold -= _tokenAmount;
        totalVolume += ethOut;

        _sendETH(platform, fee);
        _sendETH(msg.sender, netETH);

        emit TokenSold(msg.sender, _tokenAmount, netETH, getCurrentPrice());
    }

    // ═══ PRICE CALCULATIONS ═══

    function _calculateBuy(uint256 _ethAmount) internal view returns (uint256) {
        if (reserveBalance == 0 || tokenBalance == 0) return 0;
        // Bancor: tokensOut = tokenBalance * ethAmount * RR / (reserveBalance * PPM + ethAmount * RR)
        return (tokenBalance * _ethAmount * RESERVE_RATIO) / (reserveBalance * PPM + _ethAmount * RESERVE_RATIO);
    }

    function _calculateSell(uint256 _tokenAmount) internal view returns (uint256) {
        if (totalTokensSold == 0 || reserveBalance == 0) return 0;
        return (reserveBalance * _tokenAmount * RESERVE_RATIO) / (tokenBalance * PPM + _tokenAmount * RESERVE_RATIO);
    }

    function _sendETH(address _to, uint256 _amount) internal {
        if (_amount == 0) return;
        (bool sent,) = _to.call{value: _amount}("");
        require(sent, "ETH send failed");
    }

    // ═══ VIEWS ═══

    function getPrice(uint256 _ethAmount) external view returns (uint256) {
        uint256 netETH = _ethAmount - (_ethAmount * TRADE_FEE_BPS / 10000);
        return _calculateBuy(netETH);
    }

    function getSellPrice(uint256 _tokenAmount) external view returns (uint256) {
        uint256 gross = _calculateSell(_tokenAmount);
        return gross - (gross * TRADE_FEE_BPS / 10000);
    }

    function getCurrentPrice() public view returns (uint256) {
        if (tokenBalance == 0) return 0;
        return (reserveBalance * 1e18 * PPM) / (tokenBalance * RESERVE_RATIO);
    }

    function getMarketCap() external view returns (uint256) {
        return (getCurrentPrice() * totalTokensSold) / 1e18;
    }

    receive() external payable {
        reserveBalance += msg.value;
    }
}
