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
      const trustedRelayer = await this.contract.trustedRelayer();
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
      return false;
    }
  }

  getContract() {
    return this.contract;
  }

  async fulfillResolution(
    requestId: string,
    aiResponse: AIResponse
  ): Promise<ethers.TransactionReceipt | null> {
    console.log('📤 Submitting resolution to contract...');
    console.log('Request ID:', requestId);

    try {
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

      // Send transaction with 20% buffer
      const tx = await this.contract.fulfillResolution(
        requestId,
        aiResponse.verdict,
        aiResponse.summary,
        formattedSources,
        {
          gasLimit: (gasEstimate * 120n) / 100n
        }
      );

      console.log('Transaction sent:', tx.hash);
      console.log('Waiting for confirmation...');

      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed!');
      console.log('Block:', receipt?.blockNumber);
      console.log('Gas used:', receipt?.gasUsed.toString());

      return receipt;

    } catch (error: any) {
      console.error('❌ Failed to fulfill resolution:', error);
      
      if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        console.error('Transaction would revert. Possible reasons:');
        console.error('- Request already fulfilled');
        console.error('- Relayer not authorized');
        console.error('- Invalid request ID');
      }
      
      throw error;
    }
  }

  async getBalance(): Promise<string> {
    const balance = await this.provider.getBalance(this.wallet.address);
    return ethers.formatEther(balance);
  }
}

export const contractInteraction = new ContractInteraction();

