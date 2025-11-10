// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract LazyNFT is ERC721, EIP712 {
    using ECDSA for bytes32;

    uint256 private _nextTokenId = 1;
    address public minter;

    bytes32 private constant VOUCHER_TYPEHASH =
        keccak256("NFTVoucher(uint256 tokenId,string uri,uint256 minPrice)");

    struct NFTVoucher {
        uint256 tokenId;
        string uri;
        uint256 minPrice;
        bytes signature;
    }

    mapping(uint256 => string) private _tokenURIs;
    mapping(bytes => bool) private _usedSignatures;

    constructor() ERC721("LazyNFT", "LNFT") EIP712("LazyNFT", "1") {
        minter = msg.sender;
    }

    function lazyMint(
        address buyer,
        NFTVoucher calldata voucher
    ) external payable returns (uint256) {
        require(_verify(voucher), "Invalid signature");
        require(!_usedSignatures[voucher.signature], "Voucher already used");
        require(msg.value >= voucher.minPrice, "Insufficient payment");

        _usedSignatures[voucher.signature] = true;

        uint256 newTokenId = _nextTokenId;
        _nextTokenId++;

        _safeMint(buyer, newTokenId);
        _tokenURIs[newTokenId] = voucher.uri;

        payable(minter).transfer(msg.value);

        return newTokenId;
    }

    function _verify(NFTVoucher calldata voucher) internal view returns (bool) {
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    VOUCHER_TYPEHASH,
                    voucher.tokenId,
                    keccak256(bytes(voucher.uri)),
                    voucher.minPrice
                )
            )
        );

        address signer = ECDSA.recover(digest, voucher.signature);
        return signer == minter;
    }

    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        return _tokenURIs[tokenId];
    }
}
