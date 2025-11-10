async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);

  // Deploy LazyNFT
  const LazyNFT = await ethers.getContractFactory("LazyNFT");
  const lazyNFT = await LazyNFT.deploy();
  await lazyNFT.waitForDeployment();
  const nftAddress = await lazyNFT.getAddress();
  console.log("LazyNFT deployed to:", nftAddress);

  // Deploy NFTMarketplace
  const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
  const marketplace = await NFTMarketplace.deploy(deployer.address);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("NFTMarketplace deployed to:", marketplaceAddress);

  // Save addresses
  const fs = require("fs");
  const addresses = {
    LazyNFT: nftAddress,
    NFTMarketplace: marketplaceAddress
  };
  
  fs.writeFileSync(
    "./nft-contracts.json",
    JSON.stringify(addresses, null, 2)
  );
  
  console.log("\nContract addresses saved to nft-contracts.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
