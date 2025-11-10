// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NFTMarketplace is ReentrancyGuard {
    uint256 public listingCounter;
    uint256 public platformFee = 25; // 2.5% fee
    address public platformWallet;

    enum PaymentType {
        ETH,
        ERC20
    }

    struct Listing {
        uint256 listingId;
        address nftContract;
        uint256 tokenId;
        address seller;
        uint256 price;
        PaymentType paymentType;
        address paymentToken; // ERC20 address if paymentType is ERC20
        bool active;
    }

    mapping(uint256 => Listing) public listings;

    event ListingCreated(
        uint256 indexed listingId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        uint256 price,
        PaymentType paymentType
    );

    event ListingSold(uint256 indexed listingId, address buyer, uint256 price);

    event ListingCancelled(uint256 indexed listingId);

    constructor(address _platformWallet) {
        platformWallet = _platformWallet;
    }

    // List NFT for sale with ETH
    function listNFTForETH(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external {
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(
            nft.getApproved(tokenId) == address(this) ||
                nft.isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved"
        );

        listingCounter++;

        listings[listingCounter] = Listing({
            listingId: listingCounter,
            nftContract: nftContract,
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            paymentType: PaymentType.ETH,
            paymentToken: address(0),
            active: true
        });

        emit ListingCreated(
            listingCounter,
            nftContract,
            tokenId,
            msg.sender,
            price,
            PaymentType.ETH
        );
    }

    // List NFT for sale with ERC20 token
    function listNFTForERC20(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        address paymentToken
    ) external {
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(
            nft.getApproved(tokenId) == address(this) ||
                nft.isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved"
        );
        require(paymentToken != address(0), "Invalid token address");

        listingCounter++;

        listings[listingCounter] = Listing({
            listingId: listingCounter,
            nftContract: nftContract,
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            paymentType: PaymentType.ERC20,
            paymentToken: paymentToken,
            active: true
        });

        emit ListingCreated(
            listingCounter,
            nftContract,
            tokenId,
            msg.sender,
            price,
            PaymentType.ERC20
        );
    }

    // Buy NFT with ETH
    function buyWithETH(uint256 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(listing.paymentType == PaymentType.ETH, "Not ETH listing");
        require(msg.value >= listing.price, "Insufficient payment");

        listing.active = false;

        // Calculate fees
        uint256 fee = (listing.price * platformFee) / 1000;
        uint256 sellerAmount = listing.price - fee;

        // Transfer NFT to buyer
        IERC721(listing.nftContract).safeTransferFrom(
            listing.seller,
            msg.sender,
            listing.tokenId
        );

        // Transfer payments
        payable(platformWallet).transfer(fee);
        payable(listing.seller).transfer(sellerAmount);

        // Refund excess
        if (msg.value > listing.price) {
            payable(msg.sender).transfer(msg.value - listing.price);
        }

        emit ListingSold(listingId, msg.sender, listing.price);
    }

    // Buy NFT with ERC20 tokens
    function buyWithERC20(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(listing.paymentType == PaymentType.ERC20, "Not ERC20 listing");

        listing.active = false;

        // Calculate fees
        uint256 fee = (listing.price * platformFee) / 1000;
        uint256 sellerAmount = listing.price - fee;

        IERC20 paymentToken = IERC20(listing.paymentToken);

        // Transfer tokens from buyer
        require(
            paymentToken.transferFrom(msg.sender, platformWallet, fee),
            "Fee transfer failed"
        );
        require(
            paymentToken.transferFrom(msg.sender, listing.seller, sellerAmount),
            "Payment transfer failed"
        );

        // Transfer NFT to buyer
        IERC721(listing.nftContract).safeTransferFrom(
            listing.seller,
            msg.sender,
            listing.tokenId
        );

        emit ListingSold(listingId, msg.sender, listing.price);
    }

    // Cancel listing
    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "Not the seller");
        require(listing.active, "Listing not active");

        listing.active = false;

        emit ListingCancelled(listingId);
    }

    // Get listing details
    function getListing(
        uint256 listingId
    ) external view returns (Listing memory) {
        return listings[listingId];
    }
}
