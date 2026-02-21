// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * MishMesh Match NFT (Base L2)
 *
 * Minted when both users accept a match. 2 NFTs per match (one per user).
 * Mint fee: 0.01 ETH → platform wallet.
 * 5% royalty on secondary sales (EIP-2981).
 * Fully on-chain metadata + generative SVG background.
 */
contract MishMeshMatch is ERC721, ERC2981, Ownable {
    using Strings for uint256;

    uint256 public nextTokenId;
    uint256 public constant MINT_FEE = 0.01 ether;
    address public platformWallet;

    struct MatchData {
        string userA;
        string userB;
        uint256 score;         // 0-100
        string reasoning;
        string matchDate;
        string matchId;
    }

    mapping(uint256 => MatchData) public matchData;

    event MatchMinted(uint256 indexed tokenIdA, uint256 indexed tokenIdB, string matchId);

    constructor(address _platformWallet) ERC721("MishMesh Match", "MESH") Ownable(msg.sender) {
        platformWallet = _platformWallet;
        // 5% royalty (500 basis points)
        _setDefaultRoyalty(_platformWallet, 500);
    }

    /**
     * Mint a match — creates 2 NFTs (one for each user).
     * Called by platform backend with user wallet addresses.
     * Msg.value must be >= MINT_FEE (0.01 ETH).
     */
    function mintMatch(
        address recipientA,
        address recipientB,
        string calldata userAName,
        string calldata userBName,
        uint256 score,
        string calldata reasoning,
        string calldata matchDate,
        string calldata matchId
    ) external payable onlyOwner {
        require(msg.value >= MINT_FEE, "Insufficient mint fee");

        MatchData memory data = MatchData({
            userA: userAName,
            userB: userBName,
            score: score,
            reasoning: reasoning,
            matchDate: matchDate,
            matchId: matchId
        });

        uint256 tokenIdA = nextTokenId++;
        uint256 tokenIdB = nextTokenId++;

        matchData[tokenIdA] = data;
        matchData[tokenIdB] = data;

        _safeMint(recipientA, tokenIdA);
        _safeMint(recipientB, tokenIdB);

        // Send mint fee to platform wallet
        (bool sent, ) = platformWallet.call{value: msg.value}("");
        require(sent, "Fee transfer failed");

        emit MatchMinted(tokenIdA, tokenIdB, matchId);
    }

    /**
     * On-chain SVG — generative background based on score.
     * Higher score = rarer gradient colors.
     */
    function generateSVG(uint256 tokenId) public view returns (string memory) {
        MatchData memory d = matchData[tokenId];

        // Color based on score tier
        string memory c1;
        string memory c2;
        string memory tier;

        if (d.score >= 90) { c1 = "#FFD700"; c2 = "#FF6B00"; tier = "LEGENDARY"; }
        else if (d.score >= 75) { c1 = "#A855F7"; c2 = "#6366F1"; tier = "EPIC"; }
        else if (d.score >= 60) { c1 = "#06B6D4"; c2 = "#3B82F6"; tier = "RARE"; }
        else { c1 = "#6366F1"; c2 = "#8B5CF6"; tier = "COMMON"; }

        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">',
            '<defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
            '<stop offset="0%" stop-color="', c1, '"/>',
            '<stop offset="100%" stop-color="', c2, '"/>',
            '</linearGradient></defs>',
            '<rect width="600" height="600" fill="#0a0a0f"/>',
            '<rect x="20" y="20" width="560" height="560" rx="24" fill="url(#bg)" opacity="0.15"/>',
            '<text x="300" y="80" text-anchor="middle" fill="white" font-size="14" opacity="0.5">MishMesh.ai</text>',
            '<text x="300" y="240" text-anchor="middle" fill="white" font-size="28" font-weight="bold">', d.userA, '</text>',
            '<text x="300" y="290" text-anchor="middle" fill="', c1, '" font-size="40" font-weight="bold">', unicode"×", '</text>',
            '<text x="300" y="340" text-anchor="middle" fill="white" font-size="28" font-weight="bold">', d.userB, '</text>',
            '<text x="300" y="430" text-anchor="middle" fill="', c1, '" font-size="64" font-weight="bold">', d.score.toString(), '%</text>',
            '<text x="300" y="470" text-anchor="middle" fill="white" font-size="12" opacity="0.6">', tier, ' MATCH</text>',
            '<text x="300" y="550" text-anchor="middle" fill="white" font-size="11" opacity="0.3">', d.matchDate, '</text>',
            '</svg>'
        ));
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(tokenId < nextTokenId, "Token does not exist");
        MatchData memory d = matchData[tokenId];

        string memory svg = generateSVG(tokenId);
        string memory svgBase64 = Base64.encode(bytes(svg));

        string memory tier;
        if (d.score >= 90) tier = "Legendary";
        else if (d.score >= 75) tier = "Epic";
        else if (d.score >= 60) tier = "Rare";
        else tier = "Common";

        string memory json = string(abi.encodePacked(
            '{"name":"MishMesh Match: ', d.userA, ' x ', d.userB, '",',
            '"description":"', d.reasoning, '",',
            '"image":"data:image/svg+xml;base64,', svgBase64, '",',
            '"attributes":[',
            '{"trait_type":"Score","value":', d.score.toString(), '},',
            '{"trait_type":"Tier","value":"', tier, '"},',
            '{"trait_type":"Date","value":"', d.matchDate, '"},',
            '{"trait_type":"Match ID","value":"', d.matchId, '"}',
            ']}'
        ));

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function setPlatformWallet(address _new) external onlyOwner {
        platformWallet = _new;
        _setDefaultRoyalty(_new, 500);
    }
}
