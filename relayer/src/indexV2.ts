/**
 * Clarity Protocol v2: Main Entry Point
 * 
 * Hybrid AI Optimistic Oracle with 3-layer architecture
 */

import { config } from './config';
import { eventListenerV2 } from './eventListenerV2';

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('   CLARITY PROTOCOL v2 RELAYER');
  console.log('   Hybrid AI Optimistic Oracle');
  console.log('═══════════════════════════════════════');
  console.log('');

  if (!config.useV2) {
    console.error('❌ USE_V2 not set to true in .env');
    console.error('   Set USE_V2=true to use v2 architecture');
    process.exit(1);
  }

  // Start event listener
  await eventListenerV2.start();

  // For now, process questions manually or via API
  // In production, this would listen to events or API requests
  console.log('ℹ️  Manual question processing mode');
  console.log('   Use processQuestion() to handle questions');
  console.log('');

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('');
    console.log('🛑 Shutting down...');
    eventListenerV2.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('');
    console.log('🛑 Shutting down...');
    eventListenerV2.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('');
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

