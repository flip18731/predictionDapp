import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('🚀 Deploying ClarityOptimisticOracle v2');
  console.log('═══════════════════════════════════════');
  console.log('');

  // Get configuration
  const rpcUrl = process.env.BNB_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/';
  const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const arbitratorAddress = process.env.ARBITRATOR_ADDRESS; // Gnosis Safe address

  if (!deployerPrivateKey) {
    throw new Error('DEPLOYER_PRIVATE_KEY not set in .env');
  }

  if (!arbitratorAddress) {
    throw new Error('ARBITRATOR_ADDRESS (Gnosis Safe) not set in .env');
  }

  // Validate arbitrator address
  if (!ethers.isAddress(arbitratorAddress)) {
    throw new Error(`Invalid arbitrator address: ${arbitratorAddress}`);
  }

  console.log('Network: BNB Chain Testnet');
  console.log('RPC:', rpcUrl);
  console.log('Arbitrator (Gnosis Safe):', arbitratorAddress);
  console.log('');

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(deployerPrivateKey, provider);

  console.log('Deployer address:', wallet.address);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log('Balance:', ethers.formatEther(balance), 'BNB');
  console.log('');

  if (balance < ethers.parseEther('0.01')) {
    throw new Error('Insufficient balance for deployment');
  }

  // Read contract
  const contractPath = path.join(__dirname, '../artifacts/contracts/ClarityOptimisticOracle.sol/ClarityOptimisticOracle.json');
  const contractArtifact = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  const contractFactory = new ethers.ContractFactory(
    contractArtifact.abi,
    contractArtifact.bytecode,
    wallet
  );

  console.log('Deploying contract...');
  console.log('');

  // Deploy contract with Gnosis Safe as arbitrator
  const contract = await contractFactory.deploy(arbitratorAddress);
  console.log('Transaction hash:', contract.deploymentTransaction()?.hash);
  console.log('Waiting for deployment...');

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('✅ DEPLOYMENT SUCCESSFUL');
  console.log('═══════════════════════════════════════');
  console.log('Contract address:', contractAddress);
  console.log('Arbitrator:', arbitratorAddress);
  console.log('');
  console.log('BscScan:', `https://testnet.bscscan.com/address/${contractAddress}`);
  console.log('');

  // Save deployment info
  const deploymentInfo = {
    network: 'bnb_testnet',
    contractAddress,
    arbitratorAddress,
    deployer: wallet.address,
    deployedAt: new Date().toISOString(),
    proposerBond: '0.01 BNB',
    disputerBond: '0.02 BNB',
    livenessPeriod: '48 hours'
  };

  const deploymentPath = path.join(__dirname, '../deployments/optimistic-oracle-v2.json');
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log('Deployment info saved to:', deploymentPath);
  console.log('');
  console.log('📝 Next steps:');
  console.log('1. Update relayer/.env with CONTRACT_ADDRESS=' + contractAddress);
  console.log('2. Set USE_V2=true in relayer/.env');
  console.log('3. (Optional) Add GEMINI_API_KEY and CLAUDE_API_KEY for multi-AI consensus');
  console.log('4. Restart relayer');
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('');
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });

