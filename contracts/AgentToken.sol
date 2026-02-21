// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title AgentToken
 * @notice ERC-20 token born from a MishMesh Fusion Agent
 *         Fixed 1,000,000 supply. 18 decimals. Freely transferable.
 *         Metadata links back to parent Fusion.
 */
contract AgentToken is ERC20 {
    bytes32 public fusionId;
    address public founderA;
    address public founderB;
    address public bondingCurve;
    uint256 public launchedAt;

    constructor(
        string memory _name,
        string memory _symbol,
        bytes32 _fusionId,
        address _founderA,
        address _founderB,
        address _bondingCurve,
        uint256 _founderSupply, // 300,000 each (30%)
        uint256 _curveSupply    // 400,000 (40%)
    ) ERC20(_name, _symbol) {
        fusionId = _fusionId;
        founderA = _founderA;
        founderB = _founderB;
        bondingCurve = _bondingCurve;
        launchedAt = block.timestamp;

        // Mint founder tokens (30% each = 60% total)
        _mint(_founderA, _founderSupply * 1e18);
        _mint(_founderB, _founderSupply * 1e18);

        // Mint curve supply (40%) to bonding curve
        _mint(_bondingCurve, _curveSupply * 1e18);
    }
}
