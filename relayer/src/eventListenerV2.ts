/**
 * Clarity Protocol v2: Event Listener for Optimistic Oracle
 * 
 * Listens for user questions and triggers Layer 0 (Multi-AI Consensus) + Layer 1 (Propose)
 */

import { ethers } from 'ethers';
import { config } from './config';
import { contractInteractionV2 } from './contractInteractionV2';
import { AIConsensusEngine, ConsensusResult } from './aiConsensus';

export class EventListenerV2 {
  private contract: ethers.Contract;
  private aiConsensus: AIConsensusEngine;
  private isListening = false;
  private processedQuestions = new Set<string>();

  constructor() {
    this.contract = contractInteractionV2.getContract();
    
    // Initialize AI Consensus Engine
    this.aiConsensus = new AIConsensusEngine(
      config.perplexityApiKey,
      config.geminiApiKey,
      config.openaiApiKey
    );

    console.log('✅ Event Listener v2 initialized');
    console.log('AI Models: Perplexity' + 
      (config.geminiApiKey ? ' + Gemini' : '') + 
      (config.openaiApiKey ? ' + OpenAI' : ''));
  }

  async start() {
    if (this.isListening) {
      console.warn('⚠️ Event listener already started');
      return;
    }

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🚀 Starting Clarity Protocol v2 Relayer');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('Architecture:');
    console.log('  Layer 0: Multi-AI Consensus (Off-Chain)');
    console.log('  Layer 1: Optimistic Verification (On-Chain)');
    console.log('  Layer 2: Gnosis Safe Arbitration (On-Chain)');
    console.log('');

    // Check balance
    const balance = await contractInteractionV2.getBalance();
    const proposerBond = await this.contract.PROPOSER_BOND();
    console.log('Relayer balance:', balance, 'BNB');
    console.log('Required bond:', ethers.formatEther(proposerBond), 'BNB');
    
    if (parseFloat(balance) < parseFloat(ethers.formatEther(proposerBond))) {
      console.warn('');
      console.warn('⚠️ WARNING: Insufficient balance for proposing assertions!');
      console.warn('   Please fund the relayer wallet.');
      console.warn('');
    }

    // Start listening for QuestionRequested events
    this.startEventListening();

    this.isListening = true;
    console.log('✅ Event listener v2 started');
    console.log('Listening for QuestionRequested events...');
    console.log('');
  }

  /**
   * Start listening for QuestionRequested events
   */
  private startEventListening() {
    const filter = this.contract.filters.QuestionRequested();
    
    // Listen for new events
    // Note: ethers.js v6 passes the event object, not individual parameters
    this.contract.on(filter, async (...args: any[]) => {
      // In ethers.js v6, the last argument is the event object
      const event = args[args.length - 1];
      
      // Extract parameters from event.args
      let assertionId: string;
      let requester: string;
      let question: string;
      let timestamp: bigint;
      
      if (event && event.args && Array.isArray(event.args)) {
        // Event object with args array
        assertionId = event.args[0] as string;
        requester = event.args[1] as string;
        question = event.args[2] as string;
        timestamp = event.args[3] as bigint;
      } else if (args.length >= 4) {
        // Direct parameters (fallback for compatibility)
        assertionId = args[0] as string;
        requester = args[1] as string;
        question = args[2] as string;
        timestamp = args[3] as bigint;
      } else {
        console.error('❌ Could not extract event parameters:', args);
        return;
      }
      
      console.log('');
      console.log('🔔 QuestionRequested event received!');
      console.log('Assertion ID:', assertionId);
      console.log('Requester:', requester);
      console.log('Question:', question);
      console.log('Timestamp:', timestamp.toString());
      console.log('');
      
      // Validate question before processing
      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        console.error('❌ Invalid question received:', question);
        return;
      }
      
      // Process the question
      await this.processQuestion(question);
    });

    // Check for recent events on startup (optional, can be disabled to avoid rate limits)
    // Only check if CHECK_RECENT_QUESTIONS is not explicitly set to false
    const checkRecent = process.env.CHECK_RECENT_QUESTIONS !== 'false';
    if (checkRecent) {
      // Add a delay before checking to avoid rate limits on startup
      setTimeout(() => {
        this.checkRecentQuestions();
      }, 5000); // Wait 5 seconds before checking
    } else {
      console.log('ℹ️  Skipping recent questions check (CHECK_RECENT_QUESTIONS=false)');
      console.log('   Will only process new events from now on');
    }
  }

  /**
   * Check for recent QuestionRequested events
   */
  private async checkRecentQuestions() {
    try {
      const provider = (contractInteractionV2 as any).provider;
      const currentBlock = await provider.getBlockNumber();
      // Further reduced to 20 blocks (~1 minute) to minimize rate limits
      // This only catches very recent questions that might have been missed
      const blockRange = parseInt(process.env.RECENT_BLOCKS_RANGE || '20');
      const fromBlock = Math.max(0, currentBlock - blockRange);
      
      const filter = this.contract.filters.QuestionRequested();
      
      // Add retry logic with exponential backoff
      let recentEvents: ethers.Log[] = [];
      let retries = 3;
      let delay = 2000; // Start with 2 seconds
      
      while (retries > 0) {
        try {
          recentEvents = await this.contract.queryFilter(filter, fromBlock, currentBlock);
          break; // Success, exit retry loop
        } catch (error: any) {
          retries--;
          if (error.message?.includes('rate limit') || error.code === 'BAD_DATA') {
            if (retries > 0) {
              console.log(`⚠️ Rate limit hit, retrying in ${delay/1000}s... (${retries} retries left)`);
              await new Promise(resolve => setTimeout(resolve, delay));
              delay *= 2; // Exponential backoff
            } else {
              console.warn('⚠️ Could not check recent questions due to rate limit. Will process new events only.');
              return; // Give up after retries
            }
          } else {
            throw error; // Re-throw if it's not a rate limit error
          }
        }
      }
      
      console.log(`🔍 Checking for recent questions (last ${currentBlock - fromBlock} blocks)...`);
      
      for (const event of recentEvents) {
        if (event instanceof ethers.EventLog) {
          const args = event.args;
          if (args && args.length >= 4) {
            const assertionId = args[0] as string;
            const requester = args[1] as string;
            const question = args[2] as string;
            
            // Check if already processed
            const questionHash = ethers.keccak256(ethers.toUtf8Bytes(question));
            if (!this.processedQuestions.has(questionHash)) {
              console.log('📋 Found unprocessed question:', question);
              await this.processQuestion(question);
            }
          }
        }
      }
      
      if (recentEvents.length === 0) {
        console.log('✅ No recent questions found');
      }
    } catch (error: any) {
      // Don't crash on rate limit errors - just log and continue
      if (error.message?.includes('rate limit') || error.code === 'BAD_DATA') {
        console.warn('⚠️ Rate limit error checking recent questions. Will process new events only.');
      } else {
        console.error('❌ Error checking recent questions:', error.message);
      }
    }
  }

  /**
   * Process a new question through the full v2 pipeline
   */
  async processQuestion(question: string): Promise<void> {
    // Prevent duplicate processing
    const questionHash = ethers.keccak256(ethers.toUtf8Bytes(question));
    if (this.processedQuestions.has(questionHash)) {
      console.warn('⚠️ Question already processed:', question);
      return;
    }

    this.processedQuestions.add(questionHash);

    try {
      console.log('');
      console.log('═══════════════════════════════════════');
      console.log('🔔 NEW QUESTION RECEIVED');
      console.log('═══════════════════════════════════════');
      console.log('Question:', question);
      console.log('');

      // Check if already proposed
      const existing = await contractInteractionV2.getAssertion(question);
      if (existing.proposer !== ethers.ZeroAddress) {
        console.log('ℹ️ Assertion already proposed on-chain');
        return;
      }

      // LAYER 0: Multi-AI Consensus
      const consensus: ConsensusResult = await this.aiConsensus.getAIConsensus(question);

      if (!consensus.isClear || !consensus.answer) {
        console.error('');
        console.error('❌ LAYER 0 FAILED: No AI consensus reached');
        console.error('   Manual intervention required');
        console.error('');
        return;
      }

      // LAYER 1: Propose Assertion
      const receipt = await contractInteractionV2.proposeAssertion(
        question,
        consensus.answer
      );

      if (receipt) {
        console.log('');
        console.log('═══════════════════════════════════════');
        console.log('✅ FULL PIPELINE COMPLETE');
        console.log('═══════════════════════════════════════');
        console.log('Question:', question);
        console.log('Verdict:', consensus.answer.verdict);
        console.log('Transaction:', receipt.hash);
        console.log('Block:', receipt.blockNumber);
        console.log('');
        console.log('📋 Next steps:');
        console.log('   - Challenge window: 48 hours');
        console.log('   - Anyone can dispute with higher bond');
        console.log('   - If disputed, Gnosis Safe will arbitrate');
        console.log('');
      }

    } catch (error: any) {
      console.error('');
      console.error('═══════════════════════════════════════');
      console.error('❌ PROCESSING FAILED');
      console.error('═══════════════════════════════════════');
      console.error('Question:', question);
      console.error('Error:', error.message);
      console.error('');
      
      // Remove from processed set to allow retry
      this.processedQuestions.delete(questionHash);
    }
  }

  stop() {
    if (!this.isListening) {
      return;
    }

    console.log('🛑 Stopping event listener v2...');
    this.isListening = false;
    this.processedQuestions.clear();
    console.log('✅ Event listener v2 stopped');
  }
}

export const eventListenerV2 = new EventListenerV2();

