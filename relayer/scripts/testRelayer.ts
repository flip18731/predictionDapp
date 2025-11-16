import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { config } from '../src/config';
import { contractInteraction } from '../src/contractInteraction';

dotenv.config();

// Specific transaction to check
const TX_HASH = '0xed6eba4ff6d7242abf31fbbef8c1e7a6e3852210e9f9ed2da7cfc40a1ea180d7';

async function testRelayer() {
  console.log('=== RELAYER DIAGNOSTIC TEST ===\n');

  try {
    // 1. Check config
    console.log('1. Configuration:');
    console.log('   RPC URL:', config.rpcUrl);
    console.log('   Contract:', config.contractAddress);
    console.log('   Relayer Address:', contractInteraction['wallet'].address);
    console.log('');

    // 2. Check connection
    console.log('2. Network Connection:');
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const blockNumber = await provider.getBlockNumber();
    console.log('   ✅ Connected to BNB Testnet');
    console.log('   Current Block:', blockNumber);
    console.log('');

    // 3. Check contract
    console.log('3. Contract Check:');
    const contract = contractInteraction.getContract();
    const trustedRelayer = await contract.trustedRelayer();
    const relayerAddress = contractInteraction['wallet'].address;
    console.log('   Contract Address:', config.contractAddress);
    console.log('   Trusted Relayer:', trustedRelayer);
    console.log('   Our Relayer:', relayerAddress);
    console.log('   Match:', trustedRelayer.toLowerCase() === relayerAddress.toLowerCase() ? '✅ YES' : '❌ NO');
    console.log('');

    // 4. Check balance
    console.log('4. Relayer Balance:');
    const balance = await contractInteraction.getBalance();
    console.log('   Balance:', balance, 'BNB');
    console.log('   Status:', parseFloat(balance) < 0.01 ? '⚠️ LOW' : '✅ OK');
    console.log('');

    // 5. Check recent events
    console.log('5. Recent ResolutionRequested Events:');
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 1000); // Last 1000 blocks
    
    try {
      const filter = contract.filters.ResolutionRequested();
      const events = await contract.queryFilter(filter, fromBlock, currentBlock);
      console.log(`   Found ${events.length} events in last 1000 blocks`);
      
      if (events.length > 0) {
        const latest = events[events.length - 1];
        // Type guard: only process EventLog (has args), not plain Log
        if (latest instanceof ethers.EventLog && latest.args && latest.args.length >= 4) {
          console.log('   Latest Event:');
          console.log('     Request ID:', latest.args[0]);
          console.log('     Requester:', latest.args[1]);
          console.log('     Question:', latest.args[2]);
          console.log('     Block:', latest.blockNumber);
          console.log('     TX:', latest.transactionHash);
          
          // Check if fulfilled
          const resolution = await contract.getResolution(latest.args[0]);
          console.log('     Fulfilled:', resolution.fulfilled ? '✅ YES' : '❌ NO');
          if (resolution.fulfilled) {
            console.log('     Verdict:', resolution.verdict);
          }
        } else {
          console.log('   ⚠️ Latest event is not a valid EventLog');
        }
      }
    } catch (error: any) {
      console.log('   ❌ Error querying events:', error.message);
    }
    console.log('');

    // 6. Test Perplexity API
    console.log('6. Perplexity API Test:');
    if (config.perplexityApiKey) {
      console.log('   API Key: ✅ Set');
      console.log('   (Skipping actual API call to save credits)');
    } else {
      console.log('   API Key: ❌ NOT SET');
    }
    console.log('');

    // 7. Check specific transaction
    console.log('7. Checking Specific Transaction:');
    console.log('   TX Hash:', TX_HASH);
    try {
      const provider = new ethers.JsonRpcProvider(config.rpcUrl);
      const receipt = await provider.getTransactionReceipt(TX_HASH);
      
      if (receipt) {
        console.log('   ✅ Transaction found');
        console.log('   Block:', receipt.blockNumber);
        console.log('   Status:', receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED');
        console.log('   From:', receipt.from);
        console.log('   To:', receipt.to);
        console.log('   Gas Used:', receipt.gasUsed.toString());
        
        // Check for ResolutionRequested event
        const contract = contractInteraction.getContract();
        const iface = new ethers.Interface([
          'event ResolutionRequested(bytes32 indexed requestId, address indexed requester, string question, uint256 timestamp)'
        ]);
        
        let foundEvent = false;
        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed && parsed.name === 'ResolutionRequested') {
              foundEvent = true;
              console.log('   ✅ ResolutionRequested Event Found!');
              console.log('   Request ID:', parsed.args[0]);
              console.log('   Requester:', parsed.args[1]);
              console.log('   Question:', parsed.args[2]);
              console.log('   Timestamp:', new Date(Number(parsed.args[3]) * 1000).toISOString());
              
              // Check if fulfilled
              const resolution = await contract.getResolution(parsed.args[0]);
              console.log('   Fulfilled:', resolution.fulfilled ? '✅ YES' : '❌ NO');
              if (resolution.fulfilled) {
                console.log('   Verdict:', resolution.verdict);
                console.log('   Summary:', resolution.summary);
              } else {
                console.log('   ⚠️ Request NOT fulfilled yet!');
                console.log('   Relayer should process this...');
              }
            }
          } catch (e) {
            // Not our event, continue
          }
        }
        
        if (!foundEvent) {
          console.log('   ❌ ResolutionRequested event NOT found in logs');
          console.log('   This might be a different transaction');
        }
      } else {
        console.log('   ❌ Transaction not found (might be pending)');
      }
    } catch (error: any) {
      console.log('   ❌ Error checking transaction:', error.message);
    }
    console.log('');

    console.log('=== DIAGNOSTIC COMPLETE ===');
    console.log('');
    console.log('If relayer is not working:');
    console.log('1. Make sure relayer process is running: cd relayer && npm start');
    console.log('2. Check relayer console for errors');
    console.log('3. Verify contract address matches in relayer/.env');
    console.log('4. Ensure relayer wallet has BNB for gas');

  } catch (error: any) {
    console.error('❌ Diagnostic failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testRelayer();

