// Update this with your deployed contract address
const CONTRACT_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"; // UPDATE THIS!

const CONTRACT_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)",
    "function buyTokens(uint256 tokenAmount) payable",
    "function tokenPrice() view returns (uint256)",
    "function getContractBalance() view returns (uint256)",
    "event Approval(address indexed owner, address indexed spender, uint256 value)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event TokensPurchased(address indexed buyer, uint256 amount, uint256 cost)"
];

let provider;
let signer;
let contract;
let userAddress;
let trackedSpenders = [];

// Tab switching
function openTab(evt, tabName) {
    const tabContents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove("active");
    }
    
    const tabs = document.getElementsByClassName("tab");
    for (let i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove("active");
    }
    
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
}

// Connect wallet
// Connect wallet - UPDATED VERSION
async function connectWallet() {
    try {
        if (typeof window.ethereum === 'undefined') {
            alert('Please install MetaMask!');
            return;
        }

        // Always request fresh account selection
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        if (accounts.length === 0) {
            alert('No accounts found. Please unlock MetaMask.');
            return;
        }

        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();
        
        // Update lastDetectedAccount to the connected account
        lastDetectedAccount = userAddress.toLowerCase();
        
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        document.getElementById('userAccount').textContent = 
            userAddress.substring(0, 6) + '...' + userAddress.substring(38);
        document.getElementById('contractAddress').textContent = 
            CONTRACT_ADDRESS.substring(0, 6) + '...' + CONTRACT_ADDRESS.substring(38);
        
        await updateBalances();
        await loadTokenPrice();
        
        console.log('Connected:', userAddress);
    } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('Error connecting wallet: ' + error.message);
    }
}


// // Add this after connectWallet() function
// async function refreshAccount() {
//     console.log('Manual refresh triggered');
//     await connectWallet();
// }


// Update balances
async function updateBalances() {
    try {
        const tokenBalance = await contract.balanceOf(userAddress);
        document.getElementById('userBalance').textContent = 
            ethers.utils.formatEther(tokenBalance);
        
        const ethBalance = await provider.getBalance(userAddress);
        document.getElementById('ethBalance').textContent = 
            parseFloat(ethers.utils.formatEther(ethBalance)).toFixed(4);
    } catch (error) {
        console.error('Error updating balances:', error);
    }
}

// Load token price
async function loadTokenPrice() {
    try {
        const price = await contract.tokenPrice();
        const priceInEth = ethers.utils.formatEther(price);
        document.getElementById('tokenPrice').textContent = priceInEth;
    } catch (error) {
        console.error('Error loading price:', error);
        document.getElementById('tokenPrice').textContent = 'N/A';
    }
}

// Calculate cost
async function calculateCost() {
    try {
        const tokens = document.getElementById('buyCalcTokens').value || 0;
        const price = await contract.tokenPrice();
        const cost = ethers.BigNumber.from(price).mul(tokens);
        document.getElementById('calculatedCost').textContent = 
            ethers.utils.formatEther(cost);
    } catch (error) {
        document.getElementById('calculatedCost').textContent = '0';
    }
}

// Buy tokens
async function buyTokens() {
    const amount = document.getElementById('buyAmount').value;
    const statusDiv = document.getElementById('buyStatus');

    try {
        if (!amount || amount <= 0) {
            showStatus(statusDiv, 'error', 'Please enter a valid amount');
            return;
        }

        showStatus(statusDiv, 'info', 'Processing purchase... Please wait');

        const price = await contract.tokenPrice();
        const cost = ethers.BigNumber.from(price).mul(amount);

        const tx = await contract.buyTokens(amount, {
            value: cost
        });
        
        showStatus(statusDiv, 'info', 'Transaction sent. Waiting for confirmation...');
        await tx.wait();

        showStatus(statusDiv, 'success', 
            `✅ Successfully purchased ${amount} MTK tokens!<br>Transaction hash: ${tx.hash}`);

        await updateBalances();
    } catch (error) {
        console.error('Error buying tokens:', error);
        showStatus(statusDiv, 'error', `Error: ${error.message}`);
    }
}

// Transfer tokens
async function transfer() {
    const to = document.getElementById('transferTo').value;
    const amount = document.getElementById('transferAmount').value;
    const statusDiv = document.getElementById('transferStatus');

    try {
        if (!to || !amount) {
            showStatus(statusDiv, 'error', 'Please fill in all fields');
            return;
        }

        showStatus(statusDiv, 'info', 'Processing transfer... Please wait');

        const tx = await contract.transfer(to, ethers.utils.parseEther(amount));
        
        showStatus(statusDiv, 'info', 'Transaction sent. Waiting for confirmation...');
        await tx.wait();

        showStatus(statusDiv, 'success', 
            `✅ Transferred ${amount} MTK to ${to}<br>Transaction hash: ${tx.hash}`);

        await updateBalances();
    } catch (error) {
        console.error('Error transferring:', error);
        showStatus(statusDiv, 'error', `Error: ${error.message}`);
    }
}

// Approve
async function approve() {
    const spender = document.getElementById('spenderAddress').value;
    const amount = document.getElementById('approveAmount').value;
    const statusDiv = document.getElementById('approveStatus');

    try {
        if (!spender || !amount) {
            showStatus(statusDiv, 'error', 'Please fill in all fields');
            return;
        }

        showStatus(statusDiv, 'info', 'Approving... Please wait');

        const tx = await contract.approve(spender, ethers.utils.parseEther(amount));
        
        showStatus(statusDiv, 'info', 'Transaction sent. Waiting for confirmation...');
        await tx.wait();

        if (!trackedSpenders.includes(spender)) {
            trackedSpenders.push(spender);
        }

        showStatus(statusDiv, 'success', 
            `✅ Approved ${amount} MTK for ${spender}<br>Transaction hash: ${tx.hash}`);

        await loadAllowances();
    } catch (error) {
        console.error('Error approving:', error);
        showStatus(statusDiv, 'error', `Error: ${error.message}`);
    }
}

// TransferFrom
async function transferFrom() {
    const from = document.getElementById('fromAddress').value;
    const to = document.getElementById('toAddress').value;
    const amount = document.getElementById('transferFromAmount').value;
    const statusDiv = document.getElementById('transferFromStatus');

    try {
        if (!from || !to || !amount) {
            showStatus(statusDiv, 'error', 'Please fill in all fields');
            return;
        }

        showStatus(statusDiv, 'info', 'Processing transfer... Please wait');

        const tx = await contract.transferFrom(
            from, to, ethers.utils.parseEther(amount)
        );
        
        showStatus(statusDiv, 'info', 'Transaction sent. Waiting for confirmation...');
        await tx.wait();

        showStatus(statusDiv, 'success', 
            `✅ Transferred ${amount} MTK from ${from} to ${to}<br>Transaction hash: ${tx.hash}`);

        await updateBalances();
        await loadAllowances();
    } catch (error) {
        console.error('Error transferring:', error);
        showStatus(statusDiv, 'error', `Error: ${error.message}`);
    }
}

// Load allowances
async function loadAllowances() {
    try {
        if (!userAddress) {
            alert('Please connect wallet first');
            return;
        }

        const tbody = document.getElementById('allowanceBody');
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Loading...</td></tr>';

        if (trackedSpenders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No allowances tracked yet</td></tr>';
            return;
        }

        let html = '';
        for (const spender of trackedSpenders) {
            const allowance = await contract.allowance(userAddress, spender);
            const allowanceFormatted = ethers.utils.formatEther(allowance);
            const status = parseFloat(allowanceFormatted) > 0 ? '✅ Active' : '⏸️ Depleted';
            
            html += `
                <tr>
                    <td>${spender.substring(0, 10)}...${spender.substring(38)}</td>
                    <td>${allowanceFormatted}</td>
                    <td>${status}</td>
                </tr>
            `;
        }

        tbody.innerHTML = html || '<tr><td colspan="3" style="text-align: center;">No allowances found</td></tr>';
    } catch (error) {
        console.error('Error loading allowances:', error);
    }
}

// Load transfer history
async function loadTransferHistory() {
    try {
        if (!userAddress) {
            alert('Please connect wallet first');
            return;
        }

        const tbody = document.getElementById('transferBody');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading...</td></tr>';

        const filter = contract.filters.Transfer(null, null, null);
        const events = await contract.queryFilter(filter, 0, 'latest');

        const userEvents = events.filter(event => 
            event.args.from.toLowerCase() === userAddress.toLowerCase() ||
            event.args.to.toLowerCase() === userAddress.toLowerCase()
        );

        if (userEvents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No transfers found</td></tr>';
            return;
        }

        let html = '';
        for (const event of userEvents.reverse()) {
            const amount = ethers.utils.formatEther(event.args.value);
            html += `
                <tr>
                    <td>${event.blockNumber}</td>
                    <td>${event.args.from.substring(0, 10)}...</td>
                    <td>${event.args.to.substring(0, 10)}...</td>
                    <td>${amount}</td>
                    <td><a href="#" title="${event.transactionHash}">${event.transactionHash.substring(0, 10)}...</a></td>
                </tr>
            `;
        }

        tbody.innerHTML = html;
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// Show status message
function showStatus(element, type, message) {
    element.innerHTML = `<div class="status ${type}">${message}</div>`;
}

async function refreshAccount() {
    console.log('🔄 Manual refresh triggered');
    document.getElementById('userAccount').textContent = 'Refreshing...';
    
    try {
        // Force MetaMask to show account selector
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        await connectWallet();
    } catch (error) {
        console.error('Error refreshing:', error);
        document.getElementById('userAccount').textContent = 'Error - Try again';
    }
}

// Auto-connect on page load
window.addEventListener('load', async () => {
    console.log('📱 Page loaded, initializing...');
    
    if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
            console.log('✅ Found existing connection:', accounts[0]);
            await connectWallet();
        } else {
            console.log('ℹ️ No existing connection. Click "Connect MetaMask" to start.');
        }
    } else {
        console.log('❌ MetaMask not detected');
    }
});

// Listen for account changes (works sometimes, but not reliable for imported accounts)
if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', async (accounts) => {
        console.log('🔔 accountsChanged event:', accounts[0]);
        
        if (accounts.length > 0) {
            await connectWallet();
        } else {
            // User disconnected
            userAddress = null;
            document.getElementById('userAccount').textContent = 'Not connected';
            document.getElementById('userBalance').textContent = '0';
            document.getElementById('ethBalance').textContent = '0';
        }
    });
    
    // Listen for network changes
    window.ethereum.on('chainChanged', (chainId) => {
        console.log('🌐 Network changed to:', chainId);
        window.location.reload();
    });
}

console.log('✨ App initialized. Use the 🔄 Refresh button after switching accounts.');

