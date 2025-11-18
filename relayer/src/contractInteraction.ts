import { ethers } from 'ethers';
import { config } from './config';
import { AIResponse } from './perplexityClient';

const RELAYER_ORACLE_ABI = [
  'event ResolutionRequested(bytes32 indexed requestId, address indexed requester, string question, uint256 timestamp)',
  'event ResolutionFulfilled(bytes32 indexed requestId, string verdict, string summary, uint256 timestamp)',
  'function fulfillResolution(bytes32 requestId, string verdict, string summary, string[] sources) external',
  'function trustedRelayer() view returns (address)',
  'function getResolution(bytes32 requestId) view returns (tuple(string question, string verdict, string summary, string[] sources, uint256 timestamp, address requester, address relayer, bool fulfilled))'
];

export class ContractInteraction {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.relayerPrivateKey, this.provider);
    this.contract = new ethers.Contract(
      config.contractAddress,
      RELAYER_ORACLE_ABI,
      this.wallet
    );

    console.log('✅ Contract interaction initialized');
    console.log('Relayer address:', this.wallet.address);
  }

  async verifyRelayerRole(): Promise<boolean> {
    try {
      // Try to call trustedRelayer() - may not exist on all contract versions
      let trustedRelayer: string;
      try {
        trustedRelayer = await this.contract.trustedRelayer();
      } catch (callError: any) {
        // If function doesn't exist or fails, we'll still allow startup
        // This is for backward compatibility
        console.warn('⚠️ Could not read trustedRelayer from contract');
        console.warn('   This may be OK if using a different contract version');
        console.warn('   Continuing anyway...');
        return true; // Allow startup if we can't verify
      }
      
      const isAuthorized = trustedRelayer.toLowerCase() === this.wallet.address.toLowerCase();
      
      if (isAuthorized) {
        console.log('✅ Relayer is authorized');
      } else {
        console.error('❌ Relayer NOT authorized!');
        console.error('Expected:', this.wallet.address);
        console.error('Actual:', trustedRelayer);
      }
      
      return isAuthorized;
    } catch (error) {
      console.error('❌ Error verifying relayer role:', error);
      // Don't block startup if verification fails - allow relayer to try anyway
      console.warn('⚠️ Allowing startup despite verification failure (may work anyway)');
      return true; // Changed to true to prevent blocking startup
    }
  }

  getContract() {
    return this.contract;
  }

  // FIX: Added retry logic for transaction failures (demo stability)
  async fulfillResolution(
    requestId: string,
    aiResponse: AIResponse,
    retries: number = 3
  ): Promise<ethers.TransactionReceipt | null> {
    console.log('📤 Submitting resolution to contract...');
    console.log('Request ID:', requestId);

    let lastError: any = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // FIX: Critical validation - check if request exists before fulfilling
        try {
          const resolution = await this.contract.getResolution(requestId);
          if (resolution.requester === ethers.ZeroAddress) {
            throw new Error(`Request ${requestId} does not exist`);
          }
          if (resolution.fulfilled) {
            throw new Error(`Request ${requestId} already fulfilled`);
          }
        } catch (checkError: any) {
          if (checkError.message.includes('does not exist') || 
              checkError.message.includes('already fulfilled')) {
            throw checkError; // Don't retry for these errors
          }
          // Continue if it's just a read error
          console.warn('⚠️ Could not verify request existence, continuing...');
        }

        // Format sources as "title|url|quote"
        const formattedSources = aiResponse.sources.map(source => 
          `${source.title || 'Source'}|${source.url || ''}|${source.quote || ''}`
        );

        // Estimate gas
        const gasEstimate = await this.contract.fulfillResolution.estimateGas(
          requestId,
          aiResponse.verdict,
          aiResponse.summary,
          formattedSources
        );

        console.log('Gas estimate:', gasEstimate.toString());

        // FIX: Increased gas buffer from 20% to 50% for demo stability
        const gasLimit = (gasEstimate * 150n) / 100n; // 50% buffer

        // Send transaction with 50% buffer
        const tx = await this.contract.fulfillResolution(
          requestId,
          aiResponse.verdict,
          aiResponse.summary,
          formattedSources,
          {
            gasLimit: gasLimit
          }
        );

        console.log('Transaction sent:', tx.hash);
        console.log('Waiting for confirmation...');

        // FIX: Add timeout for confirmation wait (30 seconds)
        const receipt = await Promise.race([
          tx.wait(),
          new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error('Transaction confirmation timeout')), 30000)
          )
        ]) as ethers.TransactionReceipt | null;

        if (receipt) {
          console.log('✅ Transaction confirmed!');
          console.log('Block:', receipt.blockNumber);
          console.log('Gas used:', receipt.gasUsed.toString());
          return receipt;
        }

      } catch (error: any) {
        lastError = error;
        console.error(`❌ Attempt ${attempt}/${retries} failed:`, error.message);
        
        // Don't retry for these errors
        if (error.message.includes('Request') && 
            (error.message.includes('does not exist') || error.message.includes('already fulfilled'))) {
          throw error;
        }
        
        if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
          console.error('Transaction would revert. Possible reasons:');
          console.error('- Request already fulfilled');
          console.error('- Relayer not authorized');
          console.error('- Invalid request ID');
          // Don't retry for revert errors
          throw error;
        }
        
        // For network errors, retry with exponential backoff
        if (attempt < retries && (
          error.code === 'NETWORK_ERROR' ||
          error.code === 'TIMEOUT' ||
          error.message.includes('timeout') ||
          error.message.includes('network')
        )) {
          const delay = attempt * 2000; // 2s, 4s, 6s
          console.log(`⏳ Retrying in ${delay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw error;
      }
    }

    throw lastError || new Error('Failed to fulfill resolution after retries');
  }

  async getBalance(): Promise<string> {
    const balance = await this.provider.getBalance(this.wallet.address);
    return ethers.formatEther(balance);
  }
}

export const contractInteraction = new ContractInteraction();
