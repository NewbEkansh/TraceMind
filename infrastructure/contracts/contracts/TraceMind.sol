// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MedicineNFT is ERC721, Ownable {

    uint256 public nextTokenId;

    struct MedicineData {
        string batchId;
        string qrHash;
        string manufacturer;
        uint256 expiry;
        bool revoked;
    }

    mapping(uint256 => MedicineData) public medicines;

    event Minted(uint256 indexed tokenId, string qrHash);
    event Revoked(uint256 indexed tokenId);

    constructor(address initialOwner)
        ERC721("PharmaChain", "PHARMA")
        Ownable(initialOwner)
    {}

    /**
     * @dev Mint a new medicine NFT
     * Only manufacturer (owner) can mint
     */
    function mintMedicine(
        address to,
        string memory batchId,
        string memory qrHash,
        string memory manufacturer,
        uint256 expiry
    ) external onlyOwner returns (uint256) {

        uint256 tokenId = nextTokenId++;

        _safeMint(to, tokenId);

        medicines[tokenId] = MedicineData({
            batchId: batchId,
            qrHash: qrHash,
            manufacturer: manufacturer,
            expiry: expiry,
            revoked: false
        });

        emit Minted(tokenId, qrHash);
        return tokenId;
    }

    /**
     * @dev Verify medicine authenticity
     */
    function verifyMedicine(uint256 tokenId)
        external
        view
        returns (bool valid, string memory reason)
    {
        if (_ownerOf(tokenId) == address(0))
            return (false, "NOT_EXIST");

        MedicineData memory med = medicines[tokenId];

        if (med.revoked)
            return (false, "REVOKED");

        if (block.timestamp > med.expiry)
            return (false, "EXPIRED");

        return (true, "VALID");
    }

    /**
     * @dev Revoke compromised medicine
     */
    function revoke(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "NOT_EXIST");

        medicines[tokenId].revoked = true;

        emit Revoked(tokenId);
    }

    /**
     * @dev Get full medicine info
     */
    function getMedicine(uint256 tokenId)
        external
        view
        returns (MedicineData memory)
    {
        require(_ownerOf(tokenId) != address(0), "NOT_EXIST");
        return medicines[tokenId];
    }
}