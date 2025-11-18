# Clarity Protocol Relayer

Semi-decentralized oracle relayer for Clarity Protocol AI-powered prediction markets.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your values
```

3. Required environment variables:
- `BNB_RPC_URL`: BNB Chain Testnet RPC
- `RELAYER_PRIVATE_KEY`: Private key of relayer wallet (without 0x prefix)
- `CONTRACT_ADDRESS`: Deployed contract address
- `PERPLEXITY_API_KEY`: Perplexity AI API key (required)
- `USE_V2=true`: Enable v2 Optimistic Oracle mode
- `ARBITRATOR_ADDRESS`: Gnosis Safe address (for v2)

Optional (for Multi-AI Consensus):
- `GEMINI_API_KEY`: Google Gemini API key
- `OPENAI_API_KEY`: OpenAI API key

## Running

Development mode (auto-restart):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## How It Works

### v1 Mode (RelayerOracle)
1. **Listen**: Monitors `ResolutionRequested` events
2. **Fetch**: Calls Perplexity AI API
3. **Parse**: Extracts verdict, summary, and sources
4. **Submit**: Calls `fulfillResolution()` on contract
5. **Verify**: Contract stores resolution on-chain

### v2 Mode (ClarityOptimisticOracle) - Multi-AI Consensus
1. **Listen**: Receives questions (manual or via API)
2. **Multi-AI Query**: Parallel queries to Perplexity, Gemini, OpenAI
3. **Self-Verification**: Each model verifies its own response
4. **Consensus**: 2-of-3 agreement required
5. **Propose**: Calls `proposeAssertion()` with bond
6. **Challenge Window**: 48 hours for disputes

## Architecture

### v1 (RelayerOracle)
```
Contract Event → Event Listener → Perplexity API → Contract Callback
```

### v2 (ClarityOptimisticOracle)
```
Question → Multi-AI Consensus (Perplexity + Gemini + OpenAI) 
  → Self-Verification → Consensus Check → proposeAssertion() with Bond
  → Challenge Window (48h) → Finalize or Dispute
```

## Multi-AI Consensus

For v2, you can enable Multi-AI Consensus by adding Gemini and OpenAI API keys:

```env
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
```

**Benefits:**
- Higher reliability (3 models vs 1)
- 2-of-3 consensus required
- Better error detection
- System works even if one model fails

See `MULTI_AI_SETUP.md` for detailed setup instructions.

## Logs

The relayer provides detailed console logging:
- 🔔 New requests
- 📡 API calls
- 📊 AI responses  
- 📤 Transaction submissions
- ✅ Completions
- ❌ Errors

## Error Handling

- Retries on network errors
- Validates AI responses
- Checks gas before sending
- Graceful shutdown on SIGINT/SIGTERM

## Security

- Private key stored in .env (gitignored)
- Only authorized relayer can fulfill
- All actions logged for audit
- Open source for transparency

## Hackathon Note

This is a pragmatic semi-centralized approach suitable for MVP/hackathon. In production, this could be:
- Run by multiple independent operators
- Governed by DAO
- Replaced by fully decentralized oracle when available

