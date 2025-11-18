/**
 * Quick script to check relayer status
 */

import { ethers } from 'ethers';
import { config } from './src/config';
import { contractInteraction } from './src/contractInteraction';

async function checkStatus() {
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  RELAYER STATUS CHECK');
  console.log('═══════════════════════════════════════');
  console.log('');

  try {
    // 1. Config check
    console.log('1️⃣  Configuration:');
    console.log('   Contract:', config.contractAddress);
    console.log('   RPC URL:', config.rpcUrl);
    console.log('   Perplexity API:', config.perplexityApiKey ? '✅ Set' : '❌ Missing');
    console.log('');

    // 2. RPC Connection
    console.log('2️⃣  RPC Connection:');
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    try {
      const blockNumber = await provider.getBlockNumber();
      console.log('   ✅ Connected');
      console.log('   Current Block:', blockNumber);
    } catch (error: any) {
      console.log('   ❌ Failed:', error.message);
      return;
    }
    console.log('');

    // 3. Contract connection
    console.log('3️⃣  Smart Contract:');
    try {
      const contract = contractInteraction.getContract();
      const code = await provider.getCode(config.contractAddress);
      if (code === '0x') {
        console.log('   ❌ Contract not found at address');
        return;
      }
      console.log('   ✅ Contract found');
      
      // Get relayer wallet address from config
      const relayerWallet = new ethers.Wallet(config.relayerPrivateKey, provider);
      console.log('   Our Wallet:', relayerWallet.address);
      
      // Try to get trusted relayer from contract
      try {
        const relayerAddress = await contract.trustedRelayer();
        console.log('   Trusted Relayer:', relayerAddress);
        
        // Check authorization
        const isAuthorized = relayerAddress.toLowerCase() === relayerWallet.address.toLowerCase();
        if (isAuthorized) {
          console.log('   ✅ Authorization: OK');
        } else {
          console.log('   ❌ Authorization: FAILED');
          console.log('      Wallet address does not match trusted relayer');
        }
      } catch (error: any) {
        console.log('   ⚠️  Could not verify authorization (function may not exist)');
        console.log('   ℹ️  This is OK if using a different contract version');
      }
    } catch (error: any) {
      console.log('   ❌ Error:', error.message);
      return;
    }
    console.log('');

    // 4. Wallet balance
    console.log('4️⃣  Wallet Balance:');
    try {
      const relayerWallet = new ethers.Wallet(config.relayerPrivateKey, provider);
      const balance = await provider.getBalance(relayerWallet.address);
      const balanceBNB = ethers.formatEther(balance);
      console.log('   Balance:', balanceBNB, 'BNB');
      if (parseFloat(balanceBNB) < 0.01) {
        console.log('   ⚠️  Low balance! May not have enough gas.');
      } else {
        console.log('   ✅ Balance OK');
      }
    } catch (error: any) {
      console.log('   ❌ Error:', error.message);
    }
    console.log('');

    // 5. Event listener check
    console.log('5️⃣  Event Listener:');
    console.log('   ℹ️  Check if relayer process is running');
    console.log('   Run: npm start');
    console.log('');

    console.log('═══════════════════════════════════════');
    console.log('✅ Status check complete');
    console.log('═══════════════════════════════════════');
    console.log('');

  } catch (error: any) {
    console.error('');
    console.error('❌ Status check failed:', error.message);
    console.error('');
    process.exit(1);
  }
}

checkStatus();

