// Contract addresses - UPDATE these after deployment
const NFT_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const MARKETPLACE_CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

// Contract ABIs
const NFT_ABI = [
    "function lazyMint(address buyer, tuple(uint256 tokenId, string uri, uint256 minPrice, bytes signature) voucher) payable returns (uint256)",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function approve(address to, uint256 tokenId)",
    "function setApprovalForAll(address operator, bool approved)",
    "function isApprovedForAll(address owner, address operator) view returns (bool)",
    "function minter() view returns (address)"
];

const MARKETPLACE_ABI = [
    "function listNFTForETH(address nftContract, uint256 tokenId, uint256 price)",
    "function listNFTForERC20(address nftContract, uint256 tokenId, uint256 price, address paymentToken)",
    "function buyWithETH(uint256 listingId) payable",
    "function buyWithERC20(uint256 listingId)",
    "function cancelListing(uint256 listingId)",
    "function getListing(uint256 listingId) view returns (tuple(uint256 listingId, address nftContract, uint256 tokenId, address seller, uint256 price, uint8 paymentType, address paymentToken, bool active))",
    "function listingCounter() view returns (uint256)",
    "event ListingCreated(uint256 indexed listingId, address indexed nftContract, uint256 indexed tokenId, address seller, uint256 price, uint8 paymentType)",
    "event ListingSold(uint256 indexed listingId, address buyer, uint256 price)"
];

let provider;
let signer;
let nftContract;
let marketplaceContract;
let userAddress;

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
async function connectWallet() {
    try {
        if (typeof window.ethereum === 'undefined') {
            alert('Please install MetaMask!');
            return;
        }

        await window.ethereum.request({ method: 'eth_requestAccounts' });
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();
        
        nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, signer);
        marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT_ADDRESS, MARKETPLACE_ABI, signer);

        document.getElementById('userAccount').textContent = 
            userAddress.substring(0, 6) + '...' + userAddress.substring(38);
        document.getElementById('nftContract').textContent = 
            NFT_CONTRACT_ADDRESS.substring(0, 6) + '...' + NFT_CONTRACT_ADDRESS.substring(38);
        document.getElementById('marketplaceContract').textContent = 
            MARKETPLACE_CONTRACT_ADDRESS.substring(0, 6) + '...' + MARKETPLACE_CONTRACT_ADDRESS.substring(38);
        
        console.log('Connected:', userAddress);
    } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('Error connecting wallet: ' + error.message);
    }
}

// Refresh account
async function refreshAccount() {
    console.log('🔄 Manual refresh triggered');
    await connectWallet();
}

// Create voucher for lazy minting
async function createVoucher() {
    const tokenId = document.getElementById('voucherTokenId').value;
    const uri = document.getElementById('voucherURI').value;
    const priceEth = document.getElementById('voucherPrice').value;
    const statusDiv = document.getElementById('voucherStatus');

    try {
        if (!tokenId || !uri || !priceEth) {
            showStatus(statusDiv, 'error', 'Please fill in all fields');
            return;
        }

        showStatus(statusDiv, 'info', 'Creating voucher signature...');

        const minPrice = ethers.utils.parseEther(priceEth);

        // Create the voucher data structure
        const voucher = {
            tokenId: tokenId,
            uri: uri,
            minPrice: minPrice.toString()
        };

        // Create the hash for signing
        const hash = ethers.utils.solidityKeccak256(
            ['uint256', 'string', 'uint256'],
            [voucher.tokenId, voucher.uri, voucher.minPrice]
        );

        // Sign the hash
        const signature = await signer.signMessage(ethers.utils.arrayify(hash));

        // Complete voucher with signature
        const signedVoucher = {
            ...voucher,
            signature: signature
        };

        showStatus(statusDiv, 'success', '✅ Voucher created successfully!');

        // Display the voucher
        const voucherDisplay = document.getElementById('voucherDisplay');
        const voucherJSON = document.getElementById('voucherJSON');
        voucherJSON.value = JSON.stringify(signedVoucher, null, 2);
        voucherDisplay.style.display = 'block';

        console.log('Created voucher:', signedVoucher);
    } catch (error) {
        console.error('Error creating voucher:', error);
        showStatus(statusDiv, 'error', `Error: ${error.message}`);
    }
}

// Load marketplace listings
async function loadMarketplace() {
    const gridDiv = document.getElementById('marketplaceGrid');
    
    try {
        gridDiv.innerHTML = '<p>Loading listings...</p>';
        
        const listingCount = await marketplaceContract.listingCounter();
        console.log('Total listings:', listingCount.toString());
        
        if (listingCount.eq(0)) {
            gridDiv.innerHTML = '<p>No listings available yet.</p>';
            return;
        }
        
        let html = '';
        
        for (let i = 1; i <= listingCount.toNumber(); i++) {
            const listing = await marketplaceContract.getListing(i);
            
            if (!listing.active) continue;
            
            const priceFormatted = ethers.utils.formatEther(listing.price);
            const paymentTypeText = listing.paymentType === 0 ? 'ETH' : 'ERC-20';
            
            // Try to get token URI
            let imageUrl = 'https://via.placeholder.com/250';
            try {
                const uri = await nftContract.tokenURI(listing.tokenId);
                if (uri.startsWith('http')) {
                    imageUrl = uri;
                }
            } catch (e) {
                console.log('Token not minted yet or no URI');
            }
            
            html += `
                <div class="nft-card">
                    <img src="${imageUrl}" alt="NFT #${listing.tokenId}">
                    <h3>NFT #${listing.tokenId}</h3>
                    <p><strong>Seller:</strong> ${listing.seller.substring(0, 6)}...${listing.seller.substring(38)}</p>
                    <p class="price">${priceFormatted} ${paymentTypeText}</p>
                    <button class="primary" onclick="buyNFT(${i}, ${listing.paymentType})">
                        Buy Now
                    </button>
                </div>
            `;
        }
        
        if (html === '') {
            gridDiv.innerHTML = '<p>No active listings.</p>';
        } else {
            gridDiv.innerHTML = html;
        }
    } catch (error) {
        console.error('Error loading marketplace:', error);
        gridDiv.innerHTML = `<p style="color: red;">Error loading marketplace: ${error.message}</p>`;
    }
}

// Buy NFT
async function buyNFT(listingId, paymentType) {
    try {
        const listing = await marketplaceContract.getListing(listingId);
        
        if (!listing.active) {
            alert('This listing is no longer active');
            return;
        }
        
        const priceFormatted = ethers.utils.formatEther(listing.price);
        
        if (!confirm(`Buy this NFT for ${priceFormatted} ${paymentType === 0 ? 'ETH' : 'tokens'}?`)) {
            return;
        }
        
        let tx;
        
        if (paymentType === 0) {
            // Buy with ETH
            tx = await marketplaceContract.buyWithETH(listingId, {
                value: listing.price
            });
        } else {
            // Buy with ERC-20
            // First check and approve if needed
            const tokenContract = new ethers.Contract(
                listing.paymentToken,
                ['function approve(address spender, uint256 amount) returns (bool)'],
                signer
            );
            
            console.log('Approving tokens...');
            const approveTx = await tokenContract.approve(MARKETPLACE_CONTRACT_ADDRESS, listing.price);
            await approveTx.wait();
            
            console.log('Buying with ERC-20...');
            tx = await marketplaceContract.buyWithERC20(listingId);
        }
        
        console.log('Transaction sent:', tx.hash);
        alert('Transaction sent! Waiting for confirmation...');
        
        await tx.wait();
        
        alert('✅ NFT purchased successfully!');
        await loadMarketplace();
    } catch (error) {
        console.error('Error buying NFT:', error);
        alert(`Error: ${error.message}`);
    }
}

// Load user's NFTs
async function loadMyNFTs() {
    const gridDiv = document.getElementById('myNFTsGrid');
    
    try {
        gridDiv.innerHTML = '<p>Loading your NFTs...</p>';
        
        // This is a simplified version - in production you'd query events or maintain an index
        let html = '';
        let found = false;
        
        // Check first 100 token IDs (simplified approach)
        for (let tokenId = 1; tokenId <= 100; tokenId++) {
            try {
                const owner = await nftContract.ownerOf(tokenId);
                
                if (owner.toLowerCase() === userAddress.toLowerCase()) {
                    found = true;
                    
                    const uri = await nftContract.tokenURI(tokenId);
                    let imageUrl = 'https://via.placeholder.com/250';
                    if (uri.startsWith('http')) {
                        imageUrl = uri;
                    }
                    
                    html += `
                        <div class="nft-card">
                            <img src="${imageUrl}" alt="NFT #${tokenId}">
                            <h3>NFT #${tokenId}</h3>
                            <p><strong>Owner:</strong> You</p>
                            <button class="primary" onclick="approveMarketplace(${tokenId})">
                                Approve Marketplace
                            </button>
                        </div>
                    `;
                }
            } catch (e) {
                // Token doesn't exist or not owned by user
                continue;
            }
        }
        
        if (!found) {
            gridDiv.innerHTML = '<p>You don\'t own any NFTs yet.</p>';
        } else {
            gridDiv.innerHTML = html;
        }
    } catch (error) {
        console.error('Error loading NFTs:', error);
        gridDiv.innerHTML = `<p style="color: red;">Error loading NFTs: ${error.message}</p>`;
    }
}

// Approve marketplace to transfer NFT
async function approveMarketplace(tokenId) {
    try {
        console.log('Approving marketplace for token', tokenId);
        
        const tx = await nftContract.approve(MARKETPLACE_CONTRACT_ADDRESS, tokenId);
        
        alert('Transaction sent! Waiting for confirmation...');
        await tx.wait();
        
        alert('✅ Marketplace approved! You can now list this NFT for sale.');
    } catch (error) {
        console.error('Error approving marketplace:', error);
        alert(`Error: ${error.message}`);
    }
}

// Toggle payment token input
function togglePaymentToken() {
    const paymentType = document.getElementById('listPaymentType').value;
    const tokenAddressGroup = document.getElementById('tokenAddressGroup');
    
    if (paymentType === 'ERC20') {
        tokenAddressGroup.style.display = 'block';
    } else {
        tokenAddressGroup.style.display = 'none';
    }
}

// List NFT for sale
async function listNFT() {
    const tokenId = document.getElementById('listTokenId').value;
    const paymentType = document.getElementById('listPaymentType').value;
    const price = document.getElementById('listPrice').value;
    const statusDiv = document.getElementById('listStatus');

    try {
        if (!tokenId || !price) {
            showStatus(statusDiv, 'error', 'Please fill in all fields');
            return;
        }

        // Verify ownership
        const owner = await nftContract.ownerOf(tokenId);
        if (owner.toLowerCase() !== userAddress.toLowerCase()) {
            showStatus(statusDiv, 'error', 'You don\'t own this NFT');
            return;
        }

        showStatus(statusDiv, 'info', 'Listing NFT...');

        const priceWei = ethers.utils.parseEther(price);
        let tx;

        if (paymentType === 'ETH') {
            tx = await marketplaceContract.listNFTForETH(
                NFT_CONTRACT_ADDRESS,
                tokenId,
                priceWei
            );
        } else {
            const tokenAddress = document.getElementById('listTokenAddress').value;
            if (!tokenAddress) {
                showStatus(statusDiv, 'error', 'Please enter token address');
                return;
            }
            
            tx = await marketplaceContract.listNFTForERC20(
                NFT_CONTRACT_ADDRESS,
                tokenId,
                priceWei,
                tokenAddress
            );
        }

        showStatus(statusDiv, 'info', 'Transaction sent. Waiting for confirmation...');
        await tx.wait();

        showStatus(statusDiv, 'success', `✅ NFT listed successfully!<br>Transaction hash: ${tx.hash}`);

        // Clear form
        document.getElementById('listTokenId').value = '';
        document.getElementById('listPrice').value = '';
    } catch (error) {
        console.error('Error listing NFT:', error);
        showStatus(statusDiv, 'error', `Error: ${error.message}`);
    }
}

// Show status message
function showStatus(element, type, message) {
    element.innerHTML = `<div class="status ${type}">${message}</div>`;
}

// Auto-connect on page load
window.addEventListener('load', async () => {
    console.log('📱 NFT Marketplace loaded');
    
    if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
            console.log('✅ Found existing connection');
            await connectWallet();
        } else {
            console.log('ℹ️ No existing connection. Click "Connect MetaMask"');
        }
    } else {
        console.log('❌ MetaMask not detected');
    }
});

// Listen for account changes
if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', async (accounts) => {
        console.log('🔔 accountsChanged event:', accounts[0]);
        if (accounts.length > 0) {
            await connectWallet();
        } else {
            userAddress = null;
            document.getElementById('userAccount').textContent = 'Not connected';
        }
    });
    
    window.ethereum.on('chainChanged', (chainId) => {
        console.log('🌐 Network changed');
        window.location.reload();
    });
}

console.log('✨ NFT Marketplace app initialized');
