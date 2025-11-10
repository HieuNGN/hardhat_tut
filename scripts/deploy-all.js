async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);

  // Deploy original Token (keep for compatibility)
  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("Token deployed to:", tokenAddress);

  // Deploy MyTokenSale (with buy functionality)
  // Price: 0.001 ETH per token (1000000000000000 wei)
  const tokenPrice = ethers.parseEther("0.001");
  const MyTokenSale = await ethers.getContractFactory("MyTokenSale");
  const myTokenSale = await MyTokenSale.deploy(1000000, tokenPrice);
  await myTokenSale.waitForDeployment();
  const myTokenSaleAddress = await myTokenSale.getAddress();
  console.log("MyTokenSale deployed to:", myTokenSaleAddress);
  console.log("Token price: 0.001 ETH per token");

  // Save addresses
  const fs = require("fs");
  const addresses = {
    Token: tokenAddress,
    MyToken: myTokenSaleAddress  // Use MyTokenSale instead of old MyToken
  };
  
  fs.writeFileSync(
    "./deployed-contracts.json",
    JSON.stringify(addresses, null, 2)
  );
  
  console.log("\nContract addresses saved to deployed-contracts.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
