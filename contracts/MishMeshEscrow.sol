// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title MishMeshEscrow
 * @author MishMesh
 * @notice Signed Claim Authorization escrow for location-based crypto orb drops.
 *         Native ETH is held in-contract; ERC-20 / NFT tokens stay in the
 *         dropper's wallet until a verified claim pulls them via approval.
 * @dev Every claim requires an off-chain oracle signature to prevent
 *      unauthorized withdrawals. Replay protection is enforced through
 *      single-use nonces.
 */
contract MishMeshEscrow is Ownable, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // -----------------------------------------------------------------------
    //  Enums
    // -----------------------------------------------------------------------

    /// @notice The type of asset held by an orb.
    enum OrbType {
        ETH,
        ERC20,
        ERC721,
        ERC1155
    }

    /// @notice Lifecycle status of an orb.
    enum OrbStatus {
        Active,
        Claimed,
        Expired,
        Cancelled
    }

    // -----------------------------------------------------------------------
    //  Structs
    // -----------------------------------------------------------------------

    /// @notice Represents a single crypto orb drop.
    struct Orb {
        address dropper;
        OrbType orbType;
        address tokenAddress;
        uint256 tokenId;
        uint256 amount;
        uint256 claimFeeWei;
        bytes32 locationHash;
        uint256 expiresAt;
        OrbStatus status;
        bool agentsAllowed;
        uint256 createdAt;
    }

    // -----------------------------------------------------------------------
    //  State
    // -----------------------------------------------------------------------

    /// @notice Address of the trusted off-chain oracle that signs claim authorisations.
    address public mishmeshOracle;

    /// @notice Address that receives the protocol's share of claim fees.
    address public mishmeshFeeWallet;

    /// @notice Auto-incrementing orb counter (also serves as the next orb ID).
    uint256 public nextOrbId;

    /// @notice Total ETH fees accumulated from claims, available for withdrawal.
    uint256 public accumulatedFees;

    /// @notice Orb ID -> Orb data.
    mapping(uint256 => Orb) public orbs;

    /// @notice Tracks consumed nonces to prevent replay attacks.
    mapping(bytes32 => bool) public usedNonces;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    /// @notice Emitted when a new orb is created.
    event OrbCreated(
        uint256 indexed orbId,
        address indexed dropper,
        uint256 amount,
        uint256 claimFeeWei,
        uint256 expiresAt
    );

    /// @notice Emitted when an orb is successfully claimed by a hunter.
    event OrbClaimed(
        uint256 indexed orbId,
        address indexed hunter,
        uint256 amount
    );

    /// @notice Emitted when an expired orb is reclaimed.
    event OrbExpired(uint256 indexed orbId, address indexed dropper);

    /// @notice Emitted when a dropper cancels their orb.
    event OrbCancelled(uint256 indexed orbId);

    /// @notice Emitted when the oracle address is updated.
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);

    /// @notice Emitted when accumulated fees are withdrawn.
    event FeesWithdrawn(address indexed to, uint256 amount);

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    /**
     * @notice Deploys the escrow contract.
     * @param _oracle      Address of the off-chain oracle signer.
     * @param _feeWallet   Address that receives the protocol fee share.
     */
    constructor(
        address _oracle,
        address _feeWallet
    ) Ownable(msg.sender) {
        require(_oracle != address(0), "Oracle cannot be zero address");
        require(_feeWallet != address(0), "Fee wallet cannot be zero address");
        mishmeshOracle = _oracle;
        mishmeshFeeWallet = _feeWallet;
    }

    // -----------------------------------------------------------------------
    //  Orb Creation
    // -----------------------------------------------------------------------

    /**
     * @notice Creates a native ETH orb. The full orb value is held in-contract
     *         because ETH cannot be approved/pulled like ERC-20 tokens.
     * @param locationHash  keccak256(abi.encodePacked(location, salt))
     * @param claimFeeWei   Fee (in wei) that the hunter must pay when claiming.
     * @param expiresAt     Unix timestamp after which the orb can be reclaimed.
     * @param agentsAllowed Whether AI agents are permitted to claim this orb.
     * @return orbId        The ID of the newly created orb.
     */
    function createOrbETH(
        bytes32 locationHash,
        uint256 claimFeeWei,
        uint256 expiresAt,
        bool agentsAllowed
    ) external payable nonReentrant whenNotPaused returns (uint256 orbId) {
        require(msg.value > 0, "Must send ETH for orb");
        require(expiresAt > block.timestamp, "Expiry must be in the future");

        orbId = nextOrbId++;

        orbs[orbId] = Orb({
            dropper: msg.sender,
            orbType: OrbType.ETH,
            tokenAddress: address(0),
            tokenId: 0,
            amount: msg.value,
            claimFeeWei: claimFeeWei,
            locationHash: locationHash,
            expiresAt: expiresAt,
            status: OrbStatus.Active,
            agentsAllowed: agentsAllowed,
            createdAt: block.timestamp
        });

        emit OrbCreated(orbId, msg.sender, msg.value, claimFeeWei, expiresAt);
    }

    /**
     * @notice Creates an ERC-20 token orb. Tokens remain in the dropper's wallet;
     *         the contract will pull them via `transferFrom` at claim time.
     * @dev    The dropper MUST have approved this contract for at least `amount`
     *         of `tokenAddress` before calling this function.
     * @param locationHash  keccak256(abi.encodePacked(location, salt))
     * @param claimFeeWei   Fee (in wei) that the hunter must pay when claiming.
     * @param expiresAt     Unix timestamp after which the orb can be reclaimed.
     * @param agentsAllowed Whether AI agents are permitted to claim this orb.
     * @param tokenAddress  Address of the ERC-20 token contract.
     * @param amount        Number of tokens (in smallest unit) to drop.
     * @return orbId        The ID of the newly created orb.
     */
    function createOrbERC20(
        bytes32 locationHash,
        uint256 claimFeeWei,
        uint256 expiresAt,
        bool agentsAllowed,
        address tokenAddress,
        uint256 amount
    ) external nonReentrant whenNotPaused returns (uint256 orbId) {
        require(tokenAddress != address(0), "Invalid token address");
        require(amount > 0, "Amount must be > 0");
        require(expiresAt > block.timestamp, "Expiry must be in the future");
        require(
            IERC20(tokenAddress).allowance(msg.sender, address(this)) >= amount,
            "Insufficient ERC20 allowance"
        );

        orbId = nextOrbId++;

        orbs[orbId] = Orb({
            dropper: msg.sender,
            orbType: OrbType.ERC20,
            tokenAddress: tokenAddress,
            tokenId: 0,
            amount: amount,
            claimFeeWei: claimFeeWei,
            locationHash: locationHash,
            expiresAt: expiresAt,
            status: OrbStatus.Active,
            agentsAllowed: agentsAllowed,
            createdAt: block.timestamp
        });

        emit OrbCreated(orbId, msg.sender, amount, claimFeeWei, expiresAt);
    }

    /**
     * @notice Creates an NFT orb (ERC-721 or ERC-1155). The NFT remains in the
     *         dropper's wallet; the contract transfers it at claim time.
     * @dev    The dropper MUST have approved this contract for the specific NFT
     *         (setApprovalForAll or approve) before calling this function.
     * @param locationHash  keccak256(abi.encodePacked(location, salt))
     * @param claimFeeWei   Fee (in wei) that the hunter must pay when claiming.
     * @param expiresAt     Unix timestamp after which the orb can be reclaimed.
     * @param agentsAllowed Whether AI agents are permitted to claim this orb.
     * @param nftAddress    Address of the NFT contract.
     * @param tokenId       Token ID of the NFT to drop.
     * @param isERC1155     True if the NFT is ERC-1155, false for ERC-721.
     * @return orbId        The ID of the newly created orb.
     */
    function createOrbNFT(
        bytes32 locationHash,
        uint256 claimFeeWei,
        uint256 expiresAt,
        bool agentsAllowed,
        address nftAddress,
        uint256 tokenId,
        bool isERC1155
    ) external nonReentrant whenNotPaused returns (uint256 orbId) {
        require(nftAddress != address(0), "Invalid NFT address");
        require(expiresAt > block.timestamp, "Expiry must be in the future");

        if (isERC1155) {
            require(
                IERC1155(nftAddress).isApprovedForAll(msg.sender, address(this)),
                "ERC1155 not approved"
            );
        } else {
            // ERC-721: either specific approval or approval-for-all
            address approved = IERC721(nftAddress).getApproved(tokenId);
            bool approvedForAll = IERC721(nftAddress).isApprovedForAll(
                msg.sender,
                address(this)
            );
            require(
                approved == address(this) || approvedForAll,
                "ERC721 not approved"
            );
        }

        OrbType nftOrbType = isERC1155 ? OrbType.ERC1155 : OrbType.ERC721;

        orbId = nextOrbId++;

        orbs[orbId] = Orb({
            dropper: msg.sender,
            orbType: nftOrbType,
            tokenAddress: nftAddress,
            tokenId: tokenId,
            amount: 1,
            claimFeeWei: claimFeeWei,
            locationHash: locationHash,
            expiresAt: expiresAt,
            status: OrbStatus.Active,
            agentsAllowed: agentsAllowed,
            createdAt: block.timestamp
        });

        emit OrbCreated(orbId, msg.sender, 1, claimFeeWei, expiresAt);
    }

    // -----------------------------------------------------------------------
    //  Claiming
    // -----------------------------------------------------------------------

    /**
     * @notice Claims an active orb using an oracle-signed authorisation.
     * @dev    The hunter must send exactly `claimFeeWei` as msg.value.
     *         The claim fee is split 80/20 between the dropper and the
     *         MishMesh fee wallet. The orb's crypto asset is released to
     *         the hunter according to its type.
     *
     *         Signature message: keccak256(abi.encodePacked(orbId, hunter, block.chainid, nonce))
     *
     * @param orbId           ID of the orb to claim.
     * @param hunter          Address that will receive the orb's contents.
     * @param nonce           Single-use nonce to prevent replay attacks.
     * @param oracleSignature Oracle's ECDSA signature over the claim payload.
     */
    function claimOrb(
        uint256 orbId,
        address hunter,
        bytes32 nonce,
        bytes calldata oracleSignature
    ) external payable nonReentrant whenNotPaused {
        // --- Checks ---
        require(!usedNonces[nonce], "Nonce already used");

        Orb storage orb = orbs[orbId];
        require(orb.status == OrbStatus.Active, "Orb is not active");
        require(block.timestamp <= orb.expiresAt, "Orb has expired");
        require(msg.value == orb.claimFeeWei, "Incorrect claim fee");
        require(hunter != address(0), "Hunter cannot be zero address");

        // Verify oracle signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(orbId, hunter, block.chainid, nonce)
        );
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedHash.recover(oracleSignature);
        require(recoveredSigner == mishmeshOracle, "Invalid oracle signature");

        // --- Effects ---
        usedNonces[nonce] = true;
        orb.status = OrbStatus.Claimed;

        uint256 orbAmount = orb.amount;
        address dropper = orb.dropper;
        OrbType orbType = orb.orbType;
        address tokenAddress = orb.tokenAddress;
        uint256 tokenId = orb.tokenId;

        // Split claim fee: 80% to dropper, 20% to protocol
        uint256 dropperShare = (msg.value * 80) / 100;
        uint256 protocolShare = msg.value - dropperShare;
        accumulatedFees += protocolShare;

        // --- Interactions ---

        // Send dropper's share of the claim fee
        if (dropperShare > 0) {
            (bool feeSuccess, ) = payable(dropper).call{value: dropperShare}("");
            require(feeSuccess, "Dropper fee transfer failed");
        }

        // Release the orb's asset to the hunter
        if (orbType == OrbType.ETH) {
            (bool ethSuccess, ) = payable(hunter).call{value: orbAmount}("");
            require(ethSuccess, "ETH transfer to hunter failed");
        } else if (orbType == OrbType.ERC20) {
            bool tokenSuccess = IERC20(tokenAddress).transferFrom(
                dropper,
                hunter,
                orbAmount
            );
            require(tokenSuccess, "ERC20 transfer failed");
        } else if (orbType == OrbType.ERC721) {
            IERC721(tokenAddress).safeTransferFrom(dropper, hunter, tokenId);
        } else if (orbType == OrbType.ERC1155) {
            IERC1155(tokenAddress).safeTransferFrom(
                dropper,
                hunter,
                tokenId,
                1,
                ""
            );
        }

        emit OrbClaimed(orbId, hunter, orbAmount);
    }

    // -----------------------------------------------------------------------
    //  Reclaim & Cancel
    // -----------------------------------------------------------------------

    /**
     * @notice Reclaims an expired orb. Callable by anyone after `expiresAt`.
     *         For ETH orbs the contract refunds ETH to the dropper.
     *         For ERC-20 / NFT orbs the status is set to Expired so the
     *         dropper can revoke their approval at their discretion.
     * @param orbId ID of the orb to reclaim.
     */
    function reclaimExpired(uint256 orbId) external nonReentrant whenNotPaused {
        Orb storage orb = orbs[orbId];
        require(orb.status == OrbStatus.Active, "Orb is not active");
        require(block.timestamp > orb.expiresAt, "Orb has not expired yet");

        // --- Effects ---
        orb.status = OrbStatus.Expired;
        address dropper = orb.dropper;
        uint256 orbAmount = orb.amount;
        OrbType orbType = orb.orbType;

        // --- Interactions ---
        if (orbType == OrbType.ETH) {
            (bool success, ) = payable(dropper).call{value: orbAmount}("");
            require(success, "ETH refund to dropper failed");
        }
        // ERC20/NFT: tokens were never pulled, dropper can revoke approval

        emit OrbExpired(orbId, dropper);
    }

    /**
     * @notice Cancels an active orb. Only the original dropper may cancel.
     *         For ETH orbs the contract refunds ETH to the dropper.
     *         For ERC-20 / NFT orbs the status is set to Cancelled.
     * @param orbId ID of the orb to cancel.
     */
    function cancelOrb(uint256 orbId) external nonReentrant whenNotPaused {
        Orb storage orb = orbs[orbId];
        require(orb.status == OrbStatus.Active, "Orb is not active");
        require(msg.sender == orb.dropper, "Only dropper can cancel");

        // --- Effects ---
        orb.status = OrbStatus.Cancelled;
        uint256 orbAmount = orb.amount;
        OrbType orbType = orb.orbType;

        // --- Interactions ---
        if (orbType == OrbType.ETH) {
            (bool success, ) = payable(msg.sender).call{value: orbAmount}("");
            require(success, "ETH refund failed");
        }
        // ERC20/NFT: tokens were never pulled, dropper can revoke approval

        emit OrbCancelled(orbId);
    }

    // -----------------------------------------------------------------------
    //  Admin
    // -----------------------------------------------------------------------

    /**
     * @notice Updates the trusted oracle address.
     * @param newOracle The new oracle signer address.
     */
    function updateOracle(address newOracle) external onlyOwner {
        require(newOracle != address(0), "Oracle cannot be zero address");
        address oldOracle = mishmeshOracle;
        mishmeshOracle = newOracle;
        emit OracleUpdated(oldOracle, newOracle);
    }

    /**
     * @notice Pauses all state-changing operations. Emergency use only.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpauses the contract, restoring normal operations.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Withdraws all accumulated protocol fees (from claim fee splits)
     *         to the configured fee wallet.
     */
    function withdrawAccumulatedFees() external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees;
        require(amount > 0, "No fees to withdraw");

        // --- Effects ---
        accumulatedFees = 0;

        // --- Interactions ---
        (bool success, ) = payable(mishmeshFeeWallet).call{value: amount}("");
        require(success, "Fee withdrawal failed");

        emit FeesWithdrawn(mishmeshFeeWallet, amount);
    }

    // -----------------------------------------------------------------------
    //  View Helpers
    // -----------------------------------------------------------------------

    /**
     * @notice Returns the full Orb struct for a given orb ID.
     * @param orbId The orb to query.
     * @return The Orb struct.
     */
    function getOrb(uint256 orbId) external view returns (Orb memory) {
        return orbs[orbId];
    }

    /**
     * @notice Checks whether a nonce has already been consumed.
     * @param nonce The nonce to check.
     * @return True if the nonce has been used.
     */
    function isNonceUsed(bytes32 nonce) external view returns (bool) {
        return usedNonces[nonce];
    }
}
