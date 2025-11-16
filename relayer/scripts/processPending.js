const { ethers } = require('ethers');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x3348c34F4F62c464BDfDb83AFa84DB178C433299';
const RPC_URL = process.env.BNB_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/';
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;

if (!RELAYER_PRIVATE_KEY) {
  console.error('❌ RELAYER_PRIVATE_KEY not set in .env');
  process.exit(1);
}

const REQUEST_ID = '0x4c968be317e67f4e1962ebf3741b372df9de30086dba76f77a88d821012daba5';

async function processPending() {
  console.log('=== PROCESSING PENDING REQUEST ===\n');
  console.log('Request ID:', REQUEST_ID);
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
    
    console.log('Relayer Address:', wallet.address);
    console.log('');

    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      [
        'function getResolution(bytes32) view returns (tuple(string question, string verdict, string summary, string[] sources, uint256 timestamp, address requester, address relayer, bool fulfilled))',
        'function trustedRelayer() view returns (address)',
        'function fulfillResolution(bytes32 requestId, string verdict, string summary, string[] sources) external'
      ],
      wallet
    );

    // Check authorization
    const trustedRelayer = await contract.trustedRelayer();
    if (trustedRelayer.toLowerCase() !== wallet.address.toLowerCase()) {
      console.error('❌ Relayer NOT authorized!');
      console.error('Expected:', wallet.address);
      console.error('Actual:', trustedRelayer);
      return;
    }
    console.log('✅ Relayer is authorized');
    console.log('');

    // Check current resolution
    const resolution = await contract.getResolution(REQUEST_ID);
    console.log('Current Resolution:');
    console.log('  Question:', resolution.question);
    console.log('  Fulfilled:', resolution.fulfilled ? '✅ YES' : '❌ NO');
    console.log('');

    if (resolution.fulfilled) {
      console.log('✅ Request already fulfilled');
      console.log('Verdict:', resolution.verdict);
      console.log('Summary:', resolution.summary);
      return;
    }

    console.log('⚠️ Request is NOT fulfilled');
    console.log('This should be processed by the relayer');
    console.log('');
    console.log('To manually process, the relayer needs to:');
    console.log('1. Call Perplexity API with the question');
    console.log('2. Call fulfillResolution() with the result');
    console.log('');
    console.log('Make sure the relayer is running: cd relayer && npm start');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

processPending();

