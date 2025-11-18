import { ethers } from 'ethers';
import { contractInteraction } from './contractInteraction';
import { perplexityClient } from './perplexityClient';

export class EventListener {
  private contract: ethers.Contract;
  private isListening = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private processedRequests = new Set<string>();
  private lastCheckedBlock = 0;
  private rateLimitBackoff = 0; // Backoff in seconds
  private consecutiveRateLimitErrors = 0;
  private pollingDisabled = false;

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

    // Get current block for polling
    const provider = (contractInteraction as any).provider;
    const currentBlock = await provider.getBlockNumber();
    
    // Check for unfulfilled requests from recent blocks (last 100 blocks = ~5 minutes)
    // Reduced to avoid RPC rate limits
    console.log('🔍 Checking for unfulfilled requests...');
    const fromBlock = Math.max(0, currentBlock - 100);
    
    try {
      const filter = this.contract.filters.ResolutionRequested();
      const recentEvents = await this.contract.queryFilter(filter, fromBlock, currentBlock);
    
      for (const event of recentEvents) {
        // Type guard: only process EventLog (has args), not plain Log
        if (event instanceof ethers.EventLog) {
          const args = event.args;
          if (args && args.length >= 4) {
            const requestId = args[0] as string;
            const requester = args[1] as string;
            const question = args[2] as string;
            const timestamp = args[3] as bigint;
            
            try {
              // FIX: Validate request exists before processing
              const resolution = await this.contract.getResolution(requestId);
              if (resolution.requester === ethers.ZeroAddress) {
                console.warn(`⚠️ Skipping invalid request: ${requestId} (does not exist)`);
                continue;
              }
              if (!resolution.fulfilled) {
                console.log('⚠️ Found unfulfilled request:', requestId);
                // Process it
                await this.handleNewRequest(
                  requestId,
                  requester,
                  question,
                  timestamp,
                  event
                );
              }
            } catch (error) {
              // If getResolution fails, try to process anyway (might be a read error)
              console.log('⚠️ Could not check resolution, processing anyway:', requestId);
              await this.handleNewRequest(
                requestId,
                requester,
                question,
                timestamp,
                event
              );
            }
          }
        }
      }
      console.log(`✅ Checked ${recentEvents.length} events from last 100 blocks`);
    } catch (error: any) {
      // Handle RPC rate limit errors gracefully
      if (error.message && error.message.includes('rate limit')) {
        console.warn('⚠️ RPC rate limit hit while checking past events. Continuing with real-time listener only.');
        console.warn('   (This is normal for public RPC endpoints. Past events will be caught by polling.)');
      } else {
        console.warn('⚠️ Error checking past events:', error.message);
        console.warn('   Continuing with real-time listener...');
      }
    }
    
    this.lastCheckedBlock = currentBlock;
    console.log('Starting polling from block:', this.lastCheckedBlock);

    this.isListening = true;

    // Method 1: Real-time event listener
    // In ethers v6, contract.on() passes event parameters directly
    this.contract.on(
      'ResolutionRequested',
      async (requestId: string, requester: string, question: string, timestamp: bigint, event?: ethers.EventLog) => {
        await this.handleNewRequest(requestId, requester, question, timestamp, event);
      }
    );

    // Method 2: Polling fallback (adaptive interval based on rate limits)
    // FIX: Enable polling with conservative interval for demo (60s) to catch missed events
    // This ensures we don't miss events if the real-time listener fails
    this.startPolling();

    console.log('✅ Event listener started');
    console.log('Listening for ResolutionRequested events (real-time + polling fallback)');
    console.log('');
  }

  async handleNewRequest(
    requestId: string,
    requester: string,
    question: string,
    timestamp: bigint,
    event?: ethers.EventLog
  ) {
    // Avoid processing duplicates
    if (this.processedRequests.has(requestId)) {
      return;
    }

    // FIX: Validate request exists before adding to processed set
    try {
      const resolution = await this.contract.getResolution(requestId);
      if (resolution.requester === ethers.ZeroAddress) {
        console.warn(`⚠️ Skipping invalid request: ${requestId} (does not exist)`);
        return;
      }
      if (resolution.fulfilled) {
        console.log(`✅ Request ${requestId} already fulfilled, skipping`);
        return;
      }
    } catch (error) {
      // Continue if read fails (might be network issue)
      console.warn('⚠️ Could not validate request, continuing...');
    }

    this.processedRequests.add(requestId);

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🔔 NEW RESOLUTION REQUEST');
    console.log('═══════════════════════════════════════');
    console.log('Request ID:', requestId);
    console.log('Requester:', requester);
    console.log('Question:', question);
    console.log('Timestamp:', new Date(Number(timestamp) * 1000).toISOString());
    if (event) {
      console.log('Block:', event.blockNumber);
      console.log('Transaction:', event.transactionHash);
    }
    console.log('═══════════════════════════════════════');
    console.log('');

    // Process the request
    await this.processRequest(requestId, question);
  }

  startPolling() {
    // Clear existing interval if any
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    // Calculate polling interval: base 60s, increases with rate limit backoff
    const baseInterval = 60000; // 60 seconds (more conservative for public RPC)
    const interval = baseInterval + (this.rateLimitBackoff * 1000);

    this.pollingInterval = setInterval(async () => {
      await this.pollForEvents();
    }, interval);

    if (this.rateLimitBackoff > 0) {
      console.log(`⏱️ Polling interval: ${interval / 1000}s (backoff: ${this.rateLimitBackoff}s)`);
    }
  }

  async pollForEvents() {
    // Skip if we're in backoff period
    if (this.rateLimitBackoff > 0) {
      this.rateLimitBackoff = Math.max(0, this.rateLimitBackoff - 1);
      return;
    }

    // If we've hit too many rate limits, disable polling temporarily
    if (this.consecutiveRateLimitErrors >= 3) {
      // Disable polling completely - rely on real-time events only
      if (!this.pollingDisabled) {
        this.pollingDisabled = true;
        if (this.pollingInterval) {
          clearInterval(this.pollingInterval);
          this.pollingInterval = null;
        }
        console.warn('⚠️ Polling disabled due to rate limits. Relying on real-time events only.');
        console.warn('   Restart relayer to re-enable polling.');
      }
      return;
    }

    try {
      const provider = (contractInteraction as any).provider;
      const currentBlock = await provider.getBlockNumber();
      
      if (currentBlock <= this.lastCheckedBlock) {
        return; // No new blocks
      }

      // Query for events in the new block range (max 5 blocks at a time to avoid rate limits)
      const toBlock = Math.min(currentBlock, this.lastCheckedBlock + 5);
      const filter = this.contract.filters.ResolutionRequested();
      const events = await this.contract.queryFilter(filter, this.lastCheckedBlock + 1, toBlock);

      // Reset consecutive errors on success
      this.consecutiveRateLimitErrors = 0;
      this.pollingDisabled = false;

      for (const event of events) {
        // Type guard: only process EventLog (has args), not plain Log
        if (event instanceof ethers.EventLog) {
          const args = event.args;
          if (args && args.length >= 4) {
            const requestId = args[0] as string;
            const requester = args[1] as string;
            const question = args[2] as string;
            const timestamp = args[3] as bigint;

            // Check if already fulfilled
            try {
              const resolution = await this.contract.getResolution(requestId);
              if (resolution.requester === ethers.ZeroAddress) {
                console.warn(`⚠️ Skipping invalid request from polling: ${requestId}`);
                continue;
              }
              if (!resolution.fulfilled) {
                await this.handleNewRequest(requestId, requester, question, timestamp, event);
              }
            } catch (error) {
              // If getResolution fails, process anyway
              await this.handleNewRequest(requestId, requester, question, timestamp, event);
            }
          }
        }
      }

      this.lastCheckedBlock = toBlock;
    } catch (error: any) {
      const errorMessage = error.message || '';
      
      // Check if it's a rate limit error
      if (errorMessage.includes('rate limit') || error.code === 'BAD_DATA') {
        this.consecutiveRateLimitErrors++;
        
        // Exponential backoff: 60s, 120s, 240s, max 600s (10 minutes)
        this.rateLimitBackoff = Math.min(600, 60 * Math.pow(2, this.consecutiveRateLimitErrors - 1));
        
        // Restart polling with new interval
        this.startPolling();
        
        if (this.consecutiveRateLimitErrors === 1) {
          console.warn('⚠️ RPC rate limit detected. Increasing polling interval...');
        }
        
        // Don't log every error to avoid spam - only every 10th error
        if (this.consecutiveRateLimitErrors % 10 === 0) {
          console.warn(`⚠️ Rate limit errors: ${this.consecutiveRateLimitErrors}. Backoff: ${this.rateLimitBackoff}s`);
        }
      } else {
        // Non-rate-limit error
        console.error('⚠️ Error polling for events:', errorMessage);
      }
    }
  }

  async processRequest(requestId: string, question: string) {
    try {
      console.log('🤖 Processing request with AI...');
      
      // Step 1: Call Perplexity API
      // FIX: Added retry logic and better error handling
      let aiResponse;
      let retries = 3;
      let lastError: Error | null = null;

      while (retries > 0) {
        try {
          aiResponse = await perplexityClient.getResolution(question);
          break; // Success, exit retry loop
        } catch (error: any) {
          lastError = error;
          retries--;
          
          if (retries > 0) {
            const delay = (4 - retries) * 2000; // 2s, 4s, 6s
            console.warn(`⚠️ AI API call failed, retrying in ${delay/1000}s... (${retries} retries left)`);
            console.warn(`   Error: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      if (!aiResponse) {
        throw lastError || new Error('Failed to get AI response after retries');
      }
      
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

      // Step 2: Submit to contract (with retry logic built-in)
      console.log('📝 Submitting to blockchain...');
      const receipt = await contractInteraction.fulfillResolution(requestId, aiResponse, 3);

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
      
      // FIX: Remove from processed set to allow retry on next run
      this.processedRequests.delete(requestId);
      
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
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    this.isListening = false;
    this.processedRequests.clear();
    console.log('✅ Event listener stopped');
  }
}

export const eventListener = new EventListener();
