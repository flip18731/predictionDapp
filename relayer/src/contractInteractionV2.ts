/**
 * Clarity Protocol v2: Contract Interaction for Optimistic Oracle
 * 
 * Handles Layer 1 (proposeAssertion) and Layer 2 (resolveDispute) interactions
 */

import { ethers } from 'ethers';
import { config } from './config';
import { AIResponse } from './aiConsensus';

const CLARITY_OPTIMISTIC_ORACLE_ABI = [
  'event QuestionRequested(bytes32 indexed assertionId, address indexed requester, string question, uint256 timestamp)',
  'event AssertionProposed(bytes32 indexed assertionId, address indexed proposer, bytes data, uint256 challengeWindowEnd)',
  'event AssertionDisputed(bytes32 indexed assertionId, address indexed disputer, uint256 timestamp)',
  'event AssertionResolved(bytes32 indexed assertionId, bool indexed outcome, address indexed winner)',
  'event AssertionFinalized(bytes32 indexed assertionId, address indexed proposer)',
  'function requestQuestion(string calldata question) external returns (bytes32 assertionId)',
  'function proposeAssertion(bytes32 _assertionId, bytes calldata _data) external payable',
  'function disputeAssertion(bytes32 _assertionId) external payable',
  'function resolveDispute(bytes32 _assertionId, bool _outcome) external',
  'function finalizeAssertion(bytes32 _assertionId) external',
  'function getAssertion(bytes32 _assertionId) view returns (tuple(bytes data, address proposer, address disputer, uint256 bond, uint256 disputeBond, uint256 challengeWindowEnd, bool isDisputed, bool isResolved, bool isFinalized, bool resolutionOutcome))',
  'function canDispute(bytes32 _assertionId) view returns (bool)',
  'function PROPOSER_BOND() view returns (uint256)',
  'function DISPUTER_BOND() view returns (uint256)',
  'function LIVENESS_PERIOD() view returns (uint256)'
];

export class ContractInteractionV2 {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.relayerPrivateKey, this.provider);
    this.contract = new ethers.Contract(
      config.contractAddress,
      CLARITY_OPTIMISTIC_ORACLE_ABI,
      this.wallet
    );

    console.log('✅ Contract interaction v2 initialized');
    console.log('Relayer address:', this.wallet.address);
    console.log('Contract address:', config.contractAddress);
  }

  /**
   * Encode AI response to bytes for on-chain storage
   * FIX: Added length limit and truncation to prevent gas limit issues
   */
  private encodeAIResponse(aiResponse: AIResponse): Uint8Array {
    // FIX: Limit data size to prevent gas limit issues
    const truncatedResponse = {
      verdict: aiResponse.verdict.substring(0, 50),
      summary: aiResponse.summary.substring(0, 280),
      sources: aiResponse.sources
        .slice(0, 3) // Max 3 sources
        .map(s => ({
          title: s.title.substring(0, 100),
          url: s.url.substring(0, 200),
          quote: s.quote.substring(0, 200)
        })),
      confidence: aiResponse.confidence || 0
    };

    // Encode as JSON string, then to bytes
    const jsonString = JSON.stringify(truncatedResponse);
    
    // FIX: Ensure total size is under 5000 bytes (contract limit)
    if (Buffer.from(jsonString, 'utf8').length > 5000) {
      // Further truncate if needed
      const maxLength = 4800; // Leave some buffer
      const truncated = jsonString.substring(0, maxLength);
      return ethers.toUtf8Bytes(truncated);
    }
    
    return ethers.toUtf8Bytes(jsonString);
  }

  /**
   * Layer 1: Propose assertion with AI consensus result
   */
  async proposeAssertion(
    question: string,
    aiResponse: AIResponse
  ): Promise<ethers.TransactionReceipt | null> {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📝 LAYER 1: Proposing Assertion');
    console.log('═══════════════════════════════════════');
    console.log('Question:', question);
    console.log('Verdict:', aiResponse.verdict);
    console.log('');

    try {
      // Generate assertion ID from question
      const assertionId = ethers.keccak256(ethers.toUtf8Bytes(question));
      
      // Check if already proposed
      const existing = await this.contract.getAssertion(assertionId);
      if (existing.proposer !== ethers.ZeroAddress) {
        console.warn('⚠️ Assertion already proposed');
        return null;
      }

      // Get required bond
      const proposerBond = await this.contract.PROPOSER_BOND();
      console.log('Required bond:', ethers.formatEther(proposerBond), 'BNB');

      // Check balance
      const balance = await this.provider.getBalance(this.wallet.address);
      if (balance < proposerBond) {
        throw new Error(`Insufficient balance. Need ${ethers.formatEther(proposerBond)} BNB, have ${ethers.formatEther(balance)} BNB`);
      }

      // Encode AI response
      const data = this.encodeAIResponse(aiResponse);
      console.log('Encoded data size:', data.length, 'bytes');

      // FIX: Gas estimation with fallback
      let gasEstimate: bigint;
      try {
        gasEstimate = await this.contract.proposeAssertion.estimateGas(
          assertionId,
          data,
          { value: proposerBond }
        );
      } catch (estimateError: any) {
        console.warn('⚠️ Gas estimation failed, using default:', estimateError.message);
        // FIX: Use a safe default gas limit (150k is typical for simple writes)
        gasEstimate = 200000n; // Conservative default
      }

      console.log('Gas estimate:', gasEstimate.toString());
      console.log('Sending transaction...');

      // Send transaction with 20% buffer, but cap at reasonable limit
      const gasLimit = (gasEstimate * 120n) / 100n;
      const maxGasLimit = 500000n; // FIX: Cap at 500k to prevent excessive gas
      const finalGasLimit = gasLimit > maxGasLimit ? maxGasLimit : gasLimit;

      // Send transaction
      const tx = await this.contract.proposeAssertion(
        assertionId,
        data,
        {
          value: proposerBond,
          gasLimit: finalGasLimit
        }
      );

      console.log('Transaction sent:', tx.hash);
      console.log('Waiting for confirmation...');

      const receipt = await tx.wait();
      console.log('');
      console.log('✅ ASSERTION PROPOSED');
      console.log('Block:', receipt?.blockNumber);
      console.log('Assertion ID:', assertionId);
      
      // Get liveness period for demo info
      try {
        const livenessPeriod = await this.contract.LIVENESS_PERIOD();
        const windowEnd = Date.now() + Number(livenessPeriod) * 1000;
        console.log('Challenge window ends:', new Date(windowEnd).toISOString());
      } catch (e) {
        // Ignore if LIVENESS_PERIOD not available
      }
      console.log('');

      return receipt;

    } catch (error: any) {
      console.error('');
      console.error('❌ Failed to propose assertion:', error);
      
      if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        console.error('Transaction would revert. Possible reasons:');
        console.error('- Assertion already proposed');
        console.error('- Insufficient bond');
        console.error('- Invalid data (too long?)');
        console.error('- Contract error');
      }
      
      throw error;
    }
  }

  /**
   * Get assertion details
   */
  async getAssertion(question: string) {
    const assertionId = ethers.keccak256(ethers.toUtf8Bytes(question));
    return await this.contract.getAssertion(assertionId);
  }

  /**
   * Check if assertion can be disputed
   */
  async canDispute(question: string): Promise<boolean> {
    const assertionId = ethers.keccak256(ethers.toUtf8Bytes(question));
    return await this.contract.canDispute(assertionId);
  }

  /**
   * Get contract instance
   */
  getContract() {
    return this.contract;
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<string> {
    const balance = await this.provider.getBalance(this.wallet.address);
    return ethers.formatEther(balance);
  }
}

export const contractInteractionV2 = new ContractInteractionV2();
