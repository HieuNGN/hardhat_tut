const { ethers } = require("ethers");
const fs = require("fs");

const MyTokenArtifact = require("../artifacts/contracts/MyToken.sol/MyToken.json");
const contractAddress = JSON.parse(fs.readFileSync("../deployed-contracts.json")).MyToken;

async function main() {
  const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
  
  // Sử dụng 4 accounts
  const accounts = [
    new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider),
    new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", provider),
    new ethers.Wallet("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", provider),
    new ethers.Wallet("0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6", provider)
  ];
  
  const token = new ethers.Contract(contractAddress, MyTokenArtifact.abi, provider);
  
  console.log("=== Example 1: Single Approve and TransferFrom ===\n");
  
  // Account 0 approve cho Account 1 tiêu 3000 tokens
  let tx = await token.connect(accounts[0]).approve(accounts[1].address, ethers.utils.parseEther("3000"));
  await tx.wait();
  console.log("Account 0 approved Account 1 for 3000 MTK");
  
  // Account 1 chuyển 2000 từ Account 0 sang Account 2
  tx = await token.connect(accounts[1]).transferFrom(
    accounts[0].address,
    accounts[2].address,
    ethers.utils.parseEther("2000")
  );
  await tx.wait();
  console.log("Account 1 transferred 2000 MTK from Account 0 to Account 2");
  
  let allowance = await token.allowance(accounts[0].address, accounts[1].address);
  console.log("Remaining allowance:", ethers.utils.formatEther(allowance), "MTK\n");
  
  
  console.log("=== Example 2: Multiple Approvals ===\n");
  
  // Account 0 approve cho nhiều addresses
  tx = await token.connect(accounts[0]).approve(accounts[2].address, ethers.utils.parseEther("5000"));
  await tx.wait();
  console.log("Account 0 approved Account 2 for 5000 MTK");
  
  tx = await token.connect(accounts[0]).approve(accounts[3].address, ethers.utils.parseEther("7000"));
  await tx.wait();
  console.log("Account 0 approved Account 3 for 7000 MTK");
  
  // Check tất cả allowances
  console.log("\nAllowances for Account 0:");
  for (let i = 1; i < 4; i++) {
    allowance = await token.allowance(accounts[0].address, accounts[i].address);
    console.log(`  Account ${i}:`, ethers.utils.formatEther(allowance), "MTK");
  }
  
  
  console.log("\n=== Example 3: Multiple TransferFrom Calls ===\n");
  
  // Account 2 thực hiện nhiều transferFrom
  tx = await token.connect(accounts[2]).transferFrom(
    accounts[0].address,
    accounts[3].address,
    ethers.utils.parseEther("1500")
  );
  await tx.wait();
  console.log("Account 2 transferred 1500 MTK from Account 0 to Account 3");
  
  tx = await token.connect(accounts[2]).transferFrom(
    accounts[0].address,
    accounts[1].address,
    ethers.utils.parseEther("1000")
  );
  await tx.wait();
  console.log("Account 2 transferred 1000 MTK from Account 0 to Account 1");
  
  allowance = await token.allowance(accounts[0].address, accounts[2].address);
  console.log("Remaining allowance for Account 2:", ethers.utils.formatEther(allowance), "MTK");
  
  
  console.log("\n=== Final Balances ===\n");
  for (let i = 0; i < 4; i++) {
    const balance = await token.balanceOf(accounts[i].address);
    console.log(`Account ${i}:`, ethers.utils.formatEther(balance), "MTK");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
