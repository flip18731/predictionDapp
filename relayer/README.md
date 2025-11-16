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
- `RELAYER_PRIVATE_KEY`: Private key of relayer wallet
- `CONTRACT_ADDRESS`: Deployed RelayerOracle contract address
- `PERPLEXITY_API_KEY`: Perplexity AI API key

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

1. **Listen**: Monitors `ResolutionRequested` events from RelayerOracle contract
2. **Fetch**: Calls Perplexity AI API with the question
3. **Parse**: Extracts verdict, summary, and sources from AI response
4. **Submit**: Calls `fulfillResolution()` on contract with AI data
5. **Verify**: Contract stores resolution on-chain

## Architecture

```
Contract Event → Event Listener → Perplexity API → Contract Callback
```

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

