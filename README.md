# Clarity Protocol – Seedify Prediction Markets Hackathon

This workspace captures the strategy, architecture, and execution plan for delivering **Clarity Protocol**, an AI-assisted prediction market oracle purpose-built to answer CZ's mandate and the BNB Chain "RFP for Prediction Market Oracle".

## 🎯 Project Overview

Clarity Protocol is an AI-powered oracle that resolves ambiguous prediction markets in seconds by providing evidence-based verdicts with on-chain citations. Built specifically to address the infrastructure gap identified by CZ and the BNB Chain team.

**Key Features:**
- ⚡ **Fast Resolution**: 20 seconds vs 48-96 hours (UMA)
- 🔍 **Evidence-Based**: On-chain citations, not token-weighted votes
- 🤖 **AI-Powered**: Perplexity/Gemini integration via Chainlink Functions
- 🔗 **BNB Chain Native**: Built for the 20+ PM dApps on BNB Chain

## 📚 Documentation

### Quick Start Guides
- **[SETUP.md](SETUP.md)** – Complete setup guide for developers
- **[DEPLOYMENT.md](DEPLOYMENT.md)** – Step-by-step deployment instructions
- **[DEMO_SCRIPT.md](DEMO_SCRIPT.md)** – 2-minute demo script for hackathon presentation

### Configuration
- **[smart-contract/ENV_SETUP.md](smart-contract/ENV_SETUP.md)** – Smart contract environment variables
- **[dapp/ENV_SETUP.md](dapp/ENV_SETUP.md)** – Frontend environment variables

### Strategy & Architecture
- **[docs/clarity_protocol_strategy.md](docs/clarity_protocol_strategy.md)** – Comprehensive strategy document covering win strategy, MVP design, and roadmap

## 🏗️ Repository Structure

```
.
├── smart-contract/          # Hardhat workspace
│   ├── contracts/          # ClarityOracle.sol
│   ├── scripts/            # Deployment & setup scripts
│   └── test/               # Contract tests
├── chainlink/
│   └── functions/          # clarityEvidence.js (Chainlink Functions source)
├── dapp/                   # Next.js frontend
│   └── src/
│       ├── app/           # Next.js app router
│       ├── components/    # UI components
│       └── lib/           # Utilities & config
└── docs/                   # Strategy & documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MetaMask or compatible wallet
- BNB Chain testnet BNB ([faucet](https://testnet.bnbchain.org/faucet-smart))
- Chainlink Functions subscription ([functions.chain.link](https://functions.chain.link))
- Perplexity API key (or Gemini API key)

### 1. Smart Contract Setup

```bash
cd smart-contract
npm install
```

Create `.env` file (see [smart-contract/ENV_SETUP.md](smart-contract/ENV_SETUP.md)):

```env
BNB_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
DEPLOYER_PRIVATE_KEY=your_private_key
FUNCTIONS_ROUTER=0x6E2dc0F9DB014aE19888F539E59285D2Ea04244C
FUNCTIONS_SUBSCRIPTION_ID=your_subscription_id
FUNCTIONS_DON_ID=0x66756e2d6273632d746573746e65742d3100000000000000000000000000000000
FUNCTIONS_GAS_LIMIT=300000
```

Deploy:
```bash
npm run build
npm run deploy:testnet
```

Set source code:
```bash
# Add CLARITY_ORACLE_ADDRESS to .env first
npx hardhat run scripts/setSourceCode.ts --network bnb_testnet
```

### 2. Chainlink Functions Configuration

1. Create subscription at [functions.chain.link](https://functions.chain.link)
2. Fund with LINK tokens
3. Add `perplexityApiKey` to secrets bucket
4. Source code is in `chainlink/functions/clarityEvidence.js`

### 3. Frontend Setup

```bash
cd dapp
npm install
```

Create `.env.local` (see [dapp/ENV_SETUP.md](dapp/ENV_SETUP.md)):

```env
NEXT_PUBLIC_CLARITY_CONTRACT_ADDRESS=0x... # From deployment
NEXT_PUBLIC_BNB_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
NEXT_PUBLIC_CHAIN_ID=97
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

Run:
```bash
npm run dev
```

Visit `http://localhost:3000`

## 🎬 Demo Flow

1. Connect wallet to BNB Chain testnet
2. Enter question: "Did CZ use the word 'opportunity' in his October 17th tweet?" (referring to https://x.com/cz_binance/status/1979204734125748615)
3. Click "Request resolution"
4. Wait ~20-30 seconds for AI processing
5. View resolution with verdict, summary, and source citations
6. Verify on BscScan

See [DEMO_SCRIPT.md](DEMO_SCRIPT.md) for the complete 2-minute demo script.

## 🏆 Winning Strategy

This project is strategically designed to win by:

1. **Direct RFP Alignment**: Every component maps to BNB Chain RFP requirements
2. **CZ Mandate Response**: Direct answer to CZ's call for prediction-market-specific oracle
3. **Technical Superiority**: 20s vs 48h, evidence vs capital, AI vs manual
4. **Infrastructure Focus**: B2B solution for 20+ existing PM dApps
5. **AI as Core Utility**: Not a gimmick, but the solution to ambiguity

## 📖 Architecture

```
User (Frontend)
  ↓
Smart Contract (ClarityOracle.sol)
  ↓
Chainlink Functions DON
  ↓
AI API (Perplexity/Gemini)
  ↓
Chainlink Functions DON
  ↓
Smart Contract (fulfillResolution)
  ↓
Frontend (displays result)
```

## 🔧 Tech Stack

- **Blockchain**: BNB Chain Testnet
- **Smart Contract**: Solidity 0.8.23, Chainlink Functions
- **Frontend**: Next.js 14, React, Tailwind CSS
- **Web3**: wagmi, viem, ConnectKit
- **AI**: Perplexity API (or Gemini)
- **Infrastructure**: Chainlink Functions DON

## 📝 Next Steps

1. ✅ Review [SETUP.md](SETUP.md) for detailed setup
2. ✅ Follow [DEPLOYMENT.md](DEPLOYMENT.md) to deploy
3. ✅ Practice [DEMO_SCRIPT.md](DEMO_SCRIPT.md) for presentation
4. ✅ Read [docs/clarity_protocol_strategy.md](docs/clarity_protocol_strategy.md) for full context

## 🤝 Contributing

This is a hackathon project. For questions or issues:
1. Check the documentation files
2. Review the strategy document
3. Check Chainlink Functions and BNB Chain docs

## 📄 License

MIT

---

**Happy BUIDLing – the AI evidence chain starts here.** 🚀
