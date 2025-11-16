import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  rpcUrl: process.env.BNB_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/',
  relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY!,
  contractAddress: process.env.CONTRACT_ADDRESS!,
  perplexityApiKey: process.env.PERPLEXITY_API_KEY!,
  logLevel: process.env.LOG_LEVEL || 'info',
};

// Validation
if (!config.relayerPrivateKey) {
  throw new Error('RELAYER_PRIVATE_KEY not set in .env');
}

if (!config.contractAddress) {
  throw new Error('CONTRACT_ADDRESS not set in .env');
}

if (!config.perplexityApiKey) {
  throw new Error('PERPLEXITY_API_KEY not set in .env');
}

console.log('✅ Configuration loaded');
console.log('RPC:', config.rpcUrl);
console.log('Contract:', config.contractAddress);

