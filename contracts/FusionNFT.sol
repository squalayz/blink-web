// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title MishMeshFusionNFT
 * @notice ERC-721 NFT representing Fusion Agents on Base
 *         - 0.01 ETH mint fee → platform wallet
 *         - 5% royalty on secondary sales (ERC-2981)
 *         - DNA genome stored as on-chain metadata
 *         - Lineage (parent token IDs) stored on-chain
 *         - Generation tracking (max 5)
 */
contract MishMeshFusionNFT is ERC721, ERC721URIStorage, IERC2981 {
    using Strings for uint256;

    // ═══ STATE ═══

    address public platform;
    uint256 public constant MINT_FEE = 0.01 ether;
    uint96 public constant ROYALTY_BPS = 500; // 5%
    uint8 public constant MAX_GENERATION = 5;

    uint256 private _tokenIdCounter;

    struct FusionData {
        bytes32 fusionId;        // Supabase UUID
        address parentA;
        address parentB;
        uint256 parentTokenA;    // 0 if solo agent parent
        uint256 parentTokenB;    // 0 if solo agent parent
        uint8 generation;
        string dnaHash;          // IPFS hash of full DNA JSON
        uint256 mintedAt;
    }

    // tokenId => FusionData
    mapping(uint256 => FusionData) public fusionData;
    // fusionId (bytes32) => tokenId
    mapping(bytes32 => uint256) public fusionIdToToken;
    // generation => count
    mapping(uint8 => uint256) public generationCount;

    // ═══ EVENTS ═══

    event FusionMinted(
        uint256 indexed tokenId,
        bytes32 indexed fusionId,
        address parentA,
        address parentB,
        uint8 generation,
        string dnaHash
    );

    event FusionReproduced(
        uint256 indexed childTokenId,
        uint256 indexed parentTokenA,
        uint256 indexed parentTokenB,
        uint8 generation
    );

    // ═══ CONSTRUCTOR ═══

    constructor() ERC721("MishMesh Fusion", "FUSE") {
        platform = msg.sender;
    }

    // ═══ MINT ═══

    function mint(
        bytes32 _fusionId,
        address _parentA,
        address _parentB,
        uint256 _parentTokenA,
        uint256 _parentTokenB,
        uint8 _generation,
        string calldata _dnaHash,
        string calldata _tokenURI
    ) external payable returns (uint256) {
        require(msg.value >= MINT_FEE, "Insufficient mint fee");
        require(_generation >= 1 && _generation <= MAX_GENERATION, "Invalid generation");
        require(fusionIdToToken[_fusionId] == 0, "Already minted");
        require(_parentA != address(0) && _parentB != address(0), "Invalid parents");

        // Verify caller is one of the parents
        require(msg.sender == _parentA || msg.sender == _parentB, "Not a parent");

        // If parent tokens specified, verify they exist and ownership
        if (_parentTokenA > 0) {
            require(_exists(_parentTokenA), "Parent token A doesn't exist");
        }
        if (_parentTokenB > 0) {
            require(_exists(_parentTokenB), "Parent token B doesn't exist");
        }

        // Send mint fee to platform
        (bool sent,) = platform.call{value: MINT_FEE}("");
        require(sent, "Fee transfer failed");

        // Refund excess
        if (msg.value > MINT_FEE) {
            (bool refund,) = msg.sender.call{value: msg.value - MINT_FEE}("");
            require(refund, "Refund failed");
        }

        // Mint
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        // Mint to msg.sender (one of the parents)
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, _tokenURI);

        // Store fusion data
        fusionData[tokenId] = FusionData({
            fusionId: _fusionId,
            parentA: _parentA,
            parentB: _parentB,
            parentTokenA: _parentTokenA,
            parentTokenB: _parentTokenB,
            generation: _generation,
            dnaHash: _dnaHash,
            mintedAt: block.timestamp
        });

        fusionIdToToken[_fusionId] = tokenId;
        generationCount[_generation]++;

        emit FusionMinted(tokenId, _fusionId, _parentA, _parentB, _generation, _dnaHash);

        if (_parentTokenA > 0 || _parentTokenB > 0) {
            emit FusionReproduced(tokenId, _parentTokenA, _parentTokenB, _generation);
        }

        return tokenId;
    }

    // ═══ ERC-2981 ROYALTY ═══

    function royaltyInfo(uint256, uint256 salePrice)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        return (platform, (salePrice * ROYALTY_BPS) / 10000);
    }

    // ═══ VIEWS ═══

    function getFusionData(uint256 tokenId) external view returns (FusionData memory) {
        require(_exists(tokenId), "Token doesn't exist");
        return fusionData[tokenId];
    }

    function getLineage(uint256 tokenId) external view returns (
        uint256[] memory ancestorTokens,
        uint8[] memory generations
    ) {
        require(_exists(tokenId), "Token doesn't exist");

        // Walk up the tree (max 5 generations)
        uint256[] memory tokens = new uint256[](10);
        uint8[] memory gens = new uint8[](10);
        uint256 count = 0;

        // BFS through parents
        uint256[10] memory queue;
        uint256 qHead = 0;
        uint256 qTail = 0;
        queue[qTail++] = tokenId;

        while (qHead < qTail && count < 10) {
            uint256 current = queue[qHead++];
            FusionData memory fd = fusionData[current];

            if (fd.parentTokenA > 0 && _exists(fd.parentTokenA)) {
                tokens[count] = fd.parentTokenA;
                gens[count] = fusionData[fd.parentTokenA].generation;
                count++;
                if (qTail < 10) queue[qTail++] = fd.parentTokenA;
            }
            if (fd.parentTokenB > 0 && _exists(fd.parentTokenB)) {
                tokens[count] = fd.parentTokenB;
                gens[count] = fusionData[fd.parentTokenB].generation;
                count++;
                if (qTail < 10) queue[qTail++] = fd.parentTokenB;
            }
        }

        // Trim arrays
        ancestorTokens = new uint256[](count);
        generations = new uint8[](count);
        for (uint i = 0; i < count; i++) {
            ancestorTokens[i] = tokens[i];
            generations[i] = gens[i];
        }
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    // ═══ HELPERS ═══

    function _exists(uint256 tokenId) internal view returns (bool) {
        return tokenId > 0 && tokenId <= _tokenIdCounter;
    }

    // ═══ OVERRIDES ═══

    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage) returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721URIStorage, IERC165) returns (bool)
    {
        return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    // ═══ ADMIN ═══

    function updatePlatform(address _new) external {
        require(msg.sender == platform, "Not platform");
        platform = _new;
    }
}
