const { ethers } = require("ethers");
const fs = require("fs");

// Load contract ABI
const MyTokenArtifact = require("../artifacts/contracts/MyToken.sol/MyToken.json");
const contractAddress = JSON.parse(fs.readFileSync("../deployed-contracts.json")).MyToken;

async function main() {
  // Kết nối với Hardhat local network
  const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
  
  // Lấy các test accounts
  const privateKey0 = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const privateKey1 = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
  const privateKey2 = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";
  
  const account0 = new ethers.Wallet(privateKey0, provider); // Owner với tokens
  const account1 = new ethers.Wallet(privateKey1, provider); // Spender
  const account2 = new ethers.Wallet(privateKey2, provider); // Receiver
  
  console.log("Account 0 (Owner):", account0.address);
  console.log("Account 1 (Spender):", account1.address);
  console.log("Account 2 (Receiver):", account2.address);
  console.log("Contract:", contractAddress);
  
  // Connect to contract
  const token = new ethers.Contract(contractAddress, MyTokenArtifact.abi, provider);
  
  // Check balances trước khi approve
  console.log("\n=== Balances Before ===");
  const balance0 = await token.balanceOf(account0.address);
  const balance1 = await token.balanceOf(account1.address);
  const balance2 = await token.balanceOf(account2.address);
  
  console.log("Account 0:", ethers.utils.formatEther(balance0), "MTK");
  console.log("Account 1:", ethers.utils.formatEther(balance1), "MTK");
  console.log("Account 2:", ethers.utils.formatEther(balance2), "MTK");
  
  // Account 0 approve cho Account 1 được tiêu 5000 tokens
  console.log("\n=== Approving ===");
  const approveAmount = ethers.utils.parseEther("5000");
  const approveTx = await token.connect(account0).approve(account1.address, approveAmount);
  await approveTx.wait();
  console.log("Account 0 approved Account 1 to spend 5000 MTK");
  console.log("Transaction hash:", approveTx.hash);
  
  // Check allowance
  const allowance = await token.allowance(account0.address, account1.address);
  console.log("Allowance for Account 1:", ethers.utils.formatEther(allowance), "MTK");
  
  // Account 1 transfer tokens từ Account 0 sang Account 2 (dùng transferFrom)
  console.log("\n=== TransferFrom ===");
  const transferAmount = ethers.utils.parseEther("1000");
  const transferTx = await token.connect(account1).transferFrom(
    account0.address,
    account2.address,
    transferAmount
  );
  await transferTx.wait();
  console.log("Account 1 transferred 1000 MTK from Account 0 to Account 2");
  console.log("Transaction hash:", transferTx.hash);
  
  // Check allowance sau khi transferFrom
  const newAllowance = await token.allowance(account0.address, account1.address);
  console.log("Remaining allowance for Account 1:", ethers.utils.formatEther(newAllowance), "MTK");
  
  // Check balances sau khi transfer
  console.log("\n=== Balances After ===");
  const newBalance0 = await token.balanceOf(account0.address);
  const newBalance1 = await token.balanceOf(account1.address);
  const newBalance2 = await token.balanceOf(account2.address);
  
  console.log("Account 0:", ethers.utils.formatEther(newBalance0), "MTK");
  console.log("Account 1:", ethers.utils.formatEther(newBalance1), "MTK");
  console.log("Account 2:", ethers.utils.formatEther(newBalance2), "MTK");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
