import { ethers } from 'ethers';
import { contractInteraction } from './contractInteraction';
import { perplexityClient } from './perplexityClient';

export class EventListener {
  private contract: ethers.Contract;
  private isListening = false;

  constructor() {
    this.contract = contractInteraction.getContract();
  }

  async start() {
    if (this.isListening) {
      console.warn('⚠️ Already listening for events');
      return;
    }

    console.log('🎧 Starting event listener...');
    
    // Verify relayer authorization
    const isAuthorized = await contractInteraction.verifyRelayerRole();
    if (!isAuthorized) {
      throw new Error('Relayer is not authorized. Cannot start listener.');
    }

    // Check balance
    const balance = await contractInteraction.getBalance();
    console.log('💰 Relayer balance:', balance, 'BNB');
    if (parseFloat(balance) < 0.01) {
      console.warn('⚠️ Low balance! Relayer may not have enough gas for transactions.');
    }

    this.isListening = true;

    // Listen for ResolutionRequested events
    this.contract.on(
      'ResolutionRequested',
      async (requestId: string, requester: string, question: string, timestamp: bigint, event: ethers.EventLog) => {
        console.log('');
        console.log('═══════════════════════════════════════');
        console.log('🔔 NEW RESOLUTION REQUEST');
        console.log('═══════════════════════════════════════');
        console.log('Request ID:', requestId);
        console.log('Requester:', requester);
        console.log('Question:', question);
        console.log('Timestamp:', new Date(Number(timestamp) * 1000).toISOString());
        console.log('Block:', event.blockNumber);
        console.log('Transaction:', event.transactionHash);
        console.log('═══════════════════════════════════════');
        console.log('');

        // Process the request
        await this.processRequest(requestId, question);
      }
    );

    console.log('✅ Event listener started');
    console.log('Listening for ResolutionRequested events...');
    console.log('');
  }

  async processRequest(requestId: string, question: string) {
    try {
      console.log('🤖 Processing request with AI...');
      
      // Step 1: Call Perplexity API
      const aiResponse = await perplexityClient.getResolution(question);
      
      console.log('');
      console.log('📊 AI Response:');
      console.log('Verdict:', aiResponse.verdict);
      console.log('Summary:', aiResponse.summary);
      console.log('Sources:', aiResponse.sources.length);
      aiResponse.sources.forEach((source, i) => {
        console.log(`  ${i + 1}. ${source.title}`);
        console.log(`     URL: ${source.url}`);
      });
      console.log('');

      // Step 2: Submit to contract
      console.log('📝 Submitting to blockchain...');
      const receipt = await contractInteraction.fulfillResolution(requestId, aiResponse);

      if (receipt) {
        console.log('');
        console.log('═══════════════════════════════════════');
        console.log('✅ RESOLUTION COMPLETED');
        console.log('═══════════════════════════════════════');
        console.log('Request ID:', requestId);
        console.log('Block:', receipt.blockNumber);
        console.log('Transaction:', receipt.hash);
        console.log('═══════════════════════════════════════');
        console.log('');
      }

    } catch (error: any) {
      console.error('');
      console.error('═══════════════════════════════════════');
      console.error('❌ PROCESSING FAILED');
      console.error('═══════════════════════════════════════');
      console.error('Request ID:', requestId);
      console.error('Error:', error.message);
      console.error('═══════════════════════════════════════');
      console.error('');
      
      // Log full error for debugging
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
  }

  stop() {
    if (!this.isListening) {
      return;
    }

    console.log('🛑 Stopping event listener...');
    this.contract.removeAllListeners();
    this.isListening = false;
    console.log('✅ Event listener stopped');
  }
}

export const eventListener = new EventListener();

