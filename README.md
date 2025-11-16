# Clarity Protocol – Seedify Prediction Markets Hackathon

This workspace captures the strategy, architecture, and execution plan for delivering **Clarity Protocol**, an AI-assisted prediction market oracle purpose-built to answer CZ's mandate and the BNB Chain "RFP for Prediction Market Oracle".

## 🎯 Project Overview

Clarity Protocol is an AI-powered oracle that resolves ambiguous prediction markets in seconds by providing evidence-based verdicts with on-chain citations. Built specifically to address the infrastructure gap identified by CZ and the BNB Chain team.

**Key Features:**
- ⚡ **Fast Resolution**: 20 seconds vs 48-96 hours (UMA)
- 🔍 **Evidence-Based**: On-chain citations, not token-weighted votes
- 🤖 **AI-Powered**: Perplexity AI integration via custom relayer
- 🔗 **BNB Chain Native**: Built for the 20+ PM dApps on BNB Chain

## 📚 Documentation

### Quick Start Guides
- **[DEPLOYMENT_COMPLETE.md](DEPLOYMENT_COMPLETE.md)** – Complete deployment and testing guide
- **[RELAYER_IMPLEMENTATION_PLAN.md](RELAYER_IMPLEMENTATION_PLAN.md)** – Relayer architecture and implementation details

### Configuration
- **[relayer/README.md](relayer/README.md)** – Relayer setup and configuration
- **[dapp/README.md](dapp/README.md)** – Frontend setup and configuration

### Strategy & Architecture
- **[docs/clarity_protocol_strategy.md](docs/clarity_protocol_strategy.md)** – Comprehensive strategy document covering win strategy, MVP design, and roadmap

## 🏗️ Repository Structure

```
.
├── smart-contract/          # Hardhat workspace
│   ├── contracts/          # RelayerOracle.sol
│   ├── scripts/            # Deployment & setup scripts
│   └── test/               # Contract tests
├── relayer/                # Node.js relayer backend
│   ├── src/               # Relayer source code
│   │   ├── index.ts       # Main entry point
│   │   ├── eventListener.ts # Event monitoring
│   │   ├── perplexityClient.ts # AI API integration
│   │   └── contractInteraction.ts # Blockchain interaction
│   └── scripts/           # Utility scripts
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
- Perplexity API key
- Relayer wallet with BNB for gas

### 1. Smart Contract Setup

```bash
cd smart-contract
npm install
```

Create `.env` file:

```env
BNB_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
DEPLOYER_PRIVATE_KEY=your_private_key
RELAYER_ADDRESS=your_relayer_wallet_address
```

Deploy:
```bash
npm run build
npx hardhat run scripts/deployRelayer.ts --network bnb_testnet
```

### 2. Relayer Setup

```bash
cd relayer
npm install
```

Create `.env` file:

```env
BNB_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
RELAYER_PRIVATE_KEY=your_relayer_private_key
CONTRACT_ADDRESS=0x... # From deployment above
PERPLEXITY_API_KEY=your_perplexity_api_key
```

Start relayer:
```bash
npm start
```

### 3. Frontend Setup

```bash
cd dapp
npm install
```

Create `.env.local`:

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

1. Start the relayer backend (see Step 2 above)
2. Connect wallet to BNB Chain testnet in the frontend
3. Enter question: "Did CZ use the word 'opportunity' in his October 17th tweet?"
4. Click "Submit Question"
5. Wait ~20-30 seconds for AI processing
6. View resolution with verdict, summary, and source citations
7. Verify on BscScan

See [DEPLOYMENT_COMPLETE.md](DEPLOYMENT_COMPLETE.md) for detailed testing instructions.

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
Smart Contract (RelayerOracle.sol)
  ↓
Event: ResolutionRequested
  ↓
Relayer Backend (Node.js)
  ↓
AI API (Perplexity)
  ↓
Relayer Backend (parses response)
  ↓
Smart Contract (fulfillResolution)
  ↓
Frontend (displays result)
```

## 🔧 Tech Stack

- **Blockchain**: BNB Chain Testnet
- **Smart Contract**: Solidity 0.8.23, Hardhat
- **Relayer**: Node.js, TypeScript, ethers.js v6
- **Frontend**: Next.js 14, React, Tailwind CSS
- **Web3**: wagmi, viem, ConnectKit
- **AI**: Perplexity API

## 📝 Next Steps

1. ✅ Review [DEPLOYMENT_COMPLETE.md](DEPLOYMENT_COMPLETE.md) for detailed setup
2. ✅ Follow [RELAYER_IMPLEMENTATION_PLAN.md](RELAYER_IMPLEMENTATION_PLAN.md) for architecture details
3. ✅ Read [docs/clarity_protocol_strategy.md](docs/clarity_protocol_strategy.md) for full context

## 🤝 Contributing

This is a hackathon project. For questions or issues:
1. Check the documentation files
2. Review the strategy document
3. Check BNB Chain docs

## 📄 License

MIT

---

**Happy BUIDLing – the AI evidence chain starts here.** 🚀
