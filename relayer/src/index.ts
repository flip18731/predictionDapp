import { eventListener } from './eventListener';
import { config } from './config';

console.log('');
console.log('═══════════════════════════════════════════════════');
console.log('  CLARITY PROTOCOL - AI ORACLE RELAYER');
console.log('═══════════════════════════════════════════════════');
console.log('');
console.log('Network: BNB Chain Testnet');
console.log('Contract:', config.contractAddress);
console.log('');
console.log('Starting relayer...');
console.log('');

async function main() {
  try {
    await eventListener.start();
    
    console.log('');
    console.log('✅ Relayer is running!');
    console.log('');
    console.log('Waiting for resolution requests...');
    console.log('Press Ctrl+C to stop');
    console.log('');

  } catch (error: any) {
    console.error('');
    console.error('❌ Failed to start relayer:', error.message);
    console.error('');
    
    if (error.code === 'INVALID_ARGUMENT') {
      console.error('Check your .env file - CONTRACT_ADDRESS may be invalid');
    } else if (error.message.includes('not authorized')) {
      console.error('Relayer wallet is not authorized on the contract');
      console.error('Make sure the contract was deployed with this relayer address');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('Cannot connect to BNB Chain Testnet');
      console.error('Check your RPC URL');
    }
    
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('');
  console.log('Received SIGINT, shutting down gracefully...');
  eventListener.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('');
  console.log('Received SIGTERM, shutting down gracefully...');
  eventListener.stop();
  process.exit(0);
});

// Unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('');
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  console.error('');
});

process.on('uncaughtException', (error) => {
  console.error('');
  console.error('❌ Uncaught Exception:', error);
  console.error('');
  process.exit(1);
});

// Start
main();

