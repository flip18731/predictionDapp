const { ethers } = require('ethers');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const TX_HASH = '0xed6eba4ff6d7242abf31fbbef8c1e7a6e3852210e9f9ed2da7cfc40a1ea180d7';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x3348c34F4F62c464BDfDb83AFa84DB178C433299';
const RPC_URL = process.env.BNB_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/';

async function checkTransaction() {
  console.log('=== CHECKING TRANSACTION ===\n');
  console.log('TX Hash:', TX_HASH);
  console.log('Contract:', CONTRACT_ADDRESS);
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(TX_HASH);
    
    if (!receipt) {
      console.log('❌ Transaction not found or pending');
      return;
    }

    console.log('✅ Transaction found');
    console.log('Block:', receipt.blockNumber);
    console.log('Status:', receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED');
    console.log('From:', receipt.from);
    console.log('To:', receipt.to);
    console.log('Gas Used:', receipt.gasUsed.toString());
    console.log('');

    // Check if it's to our contract
    if (receipt.to?.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
      console.log('⚠️ Transaction is NOT to our contract!');
      console.log('Expected:', CONTRACT_ADDRESS);
      console.log('Actual:', receipt.to);
      return;
    }

    console.log('✅ Transaction is to our contract');
    console.log('');

    // Parse events
    const iface = new ethers.Interface([
      'event ResolutionRequested(bytes32 indexed requestId, address indexed requester, string question, uint256 timestamp)',
      'event ResolutionFulfilled(bytes32 indexed requestId, string verdict, string summary, uint256 timestamp)'
    ]);

    let foundRequest = false;
    let foundFulfill = false;

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        
        if (parsed.name === 'ResolutionRequested') {
          foundRequest = true;
          console.log('✅ ResolutionRequested Event Found!');
          console.log('Request ID:', parsed.args[0]);
          console.log('Requester:', parsed.args[1]);
          console.log('Question:', parsed.args[2]);
          console.log('Timestamp:', new Date(Number(parsed.args[3]) * 1000).toISOString());
          console.log('');

          // Check if fulfilled
          const contract = new ethers.Contract(
            CONTRACT_ADDRESS,
            ['function getResolution(bytes32) view returns (tuple(string question, string verdict, string summary, string[] sources, uint256 timestamp, address requester, address relayer, bool fulfilled))'],
            provider
          );

          try {
            const resolution = await contract.getResolution(parsed.args[0]);
            console.log('Resolution Status:');
            console.log('  Fulfilled:', resolution.fulfilled ? '✅ YES' : '❌ NO');
            
            if (resolution.fulfilled) {
              console.log('  Verdict:', resolution.verdict);
              console.log('  Summary:', resolution.summary);
              console.log('  Sources:', resolution.sources.length);
              console.log('  Relayer:', resolution.relayer);
            } else {
              console.log('  ⚠️ Request NOT fulfilled yet!');
              console.log('  Relayer should process this...');
            }
          } catch (e) {
            console.log('  ⚠️ Could not read resolution:', e.message);
          }
        }

        if (parsed.name === 'ResolutionFulfilled') {
          foundFulfill = true;
          console.log('✅ ResolutionFulfilled Event Found!');
          console.log('Request ID:', parsed.args[0]);
          console.log('Verdict:', parsed.args[1]);
          console.log('Summary:', parsed.args[2]);
        }
      } catch (e) {
        // Not our event
      }
    }

    if (!foundRequest) {
      console.log('❌ ResolutionRequested event NOT found');
      console.log('This transaction might not be a requestResolution call');
    }

    console.log('');
    console.log('=== ANALYSIS COMPLETE ===');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

checkTransaction();

