// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyTokenSale is ERC20 {
    uint256 public tokenPrice; // Wei per token
    address public owner;

    event TokensPurchased(address indexed buyer, uint256 amount, uint256 cost);
    event PriceUpdated(uint256 newPrice);

    constructor(
        uint256 initialSupply,
        uint256 _tokenPrice
    ) ERC20("MyToken", "MTK") {
        owner = msg.sender;
        tokenPrice = _tokenPrice;
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    // Mua token bằng ETH
    function buyTokens(uint256 tokenAmount) external payable {
        uint256 cost = tokenAmount * tokenPrice;
        require(msg.value >= cost, "Insufficient ETH sent");
        require(
            balanceOf(owner) >= tokenAmount * 10 ** decimals(),
            "Not enough tokens available"
        );

        // Transfer tokens from owner to buyer
        _transfer(owner, msg.sender, tokenAmount * 10 ** decimals());

        // Hoàn lại ETH thừa nếu có
        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }

        emit TokensPurchased(msg.sender, tokenAmount, cost);
    }

    // Owner update giá token
    function setTokenPrice(uint256 newPrice) external onlyOwner {
        tokenPrice = newPrice;
        emit PriceUpdated(newPrice);
    }

    // Owner rút ETH
    function withdrawETH() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    // Xem số ETH trong contract
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
