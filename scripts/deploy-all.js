async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);

  // Deploy original Token
  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("Token deployed to:", tokenAddress);

  // Deploy MyToken (ERC-20)
  const MyToken = await ethers.getContractFactory("MyToken");
  const myToken = await MyToken.deploy(1000000);
  await myToken.waitForDeployment();
  const myTokenAddress = await myToken.getAddress();
  console.log("MyToken (ERC-20) deployed to:", myTokenAddress);

  // Save addresses
  const fs = require("fs");
  const addresses = {
    Token: tokenAddress,
    MyToken: myTokenAddress
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
