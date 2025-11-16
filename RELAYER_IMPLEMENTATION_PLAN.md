# 🔧 Custom Relayer Implementation Plan

## Perplexity Recommendation: Custom Relayer ✅

**Success Probability:** 90%  
**Implementation Time:** 4-6 hours  
**Status:** APPROVED - Starting Implementation NOW

---

## Architecture Overview

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │ 1. Call requestResolution()
       ▼
┌──────────────────────────────┐
│  RelayerOracle.sol           │
│  (BNB Chain Testnet)         │
│  - Emits ResolutionRequested │
└──────────────┬───────────────┘
               │ Event
               ▼
┌──────────────────────────────┐
│  Node.js Relayer (Off-Chain) │
│  - Listens for events        │
│  - Calls Perplexity API      │
│  - Parses JSON response      │
│  - Signs result              │
└──────────────┬───────────────┘
               │ 2. Call fulfillResolution()
               ▼
┌──────────────────────────────┐
│  RelayerOracle.sol           │
│  - Verifies relayer          │
│  - Stores resolution         │
│  - Emits ResolutionFulfilled │
└──────────────┬───────────────┘
               │
               ▼
           Frontend displays result
```

---

## Implementation Steps

### ✅ Step 1: Smart Contract (30 min) - IN PROGRESS

**File:** `smart-contract/contracts/RelayerOracle.sol`

**Features:**
- ✅ `requestResolution()` - Emits event
- ✅ `fulfillResolution()` - Relayer callback
- ✅ `trustedRelayer` - Access control
- ✅ Signature verification
- ✅ Event logging for transparency

**Deploy Command:**
```bash
npm run deploy:relayer
```

---

### ⏳ Step 2: Node.js Relayer Setup (1 hr)

**Create:** `relayer/` directory

**Stack:**
- Node.js + TypeScript
- ethers.js (v6) for blockchain interaction
- dotenv for configuration
- axios for HTTP requests

**Files to create:**
1. `relayer/package.json`
2. `relayer/tsconfig.json`
3. `relayer/.env`
4. `relayer/src/index.ts`
5. `relayer/src/eventListener.ts`
6. `relayer/src/perplexityClient.ts`
7. `relayer/src/contractInteraction.ts`

---

### ⏳ Step 3: Event Listener (1 hr)

**File:** `relayer/src/eventListener.ts`

**Functionality:**
```typescript
- Connect to BNB Chain Testnet RPC
- Listen for ResolutionRequested events
- Extract: requestId, question, requester
- Pass to Perplexity handler
```

---

### ⏳ Step 4: Perplexity Integration (1.5 hrs)

**File:** `relayer/src/perplexityClient.ts`

**Functionality:**
```typescript
- Format question as Perplexity prompt
- Call Perplexity API
- Parse JSON response: {verdict, summary, sources}
- Validate response format
- Error handling & retries
```

---

### ⏳ Step 5: ABI Encoding & Submit (1.5 hrs)

**File:** `relayer/src/contractInteraction.ts`

**Functionality:**
```typescript
- ABI-encode: verdict, summary, sources[]
- Sign transaction with relayer private key
- Call fulfillResolution() on contract
- Wait for confirmation
- Log result
```

---

### ⏳ Step 6: Testing & Verification (1 hr)

**Tests:**
1. Unit test: Perplexity API call
2. Unit test: ABI encoding
3. Integration test: End-to-end flow
4. Manual test: Frontend → Contract → Relayer → Contract

---

### ⏳ Step 7: Deployment

**Relayer Hosting Options:**
1. **Local** (for hackathon demo): Run on laptop
2. **Railway.app**: Free tier, easy deploy
3. **Render.com**: Free tier
4. **Heroku**: Free tier (limited)

**Recommendation:** Start local, deploy to Railway if time permits

---

## Configuration

### Smart Contract `.env`
```env
BNB_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
DEPLOYER_PRIVATE_KEY=<your_key>
RELAYER_ADDRESS=<relayer_wallet_address>
```

### Relayer `.env`
```env
BNB_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
RELAYER_PRIVATE_KEY=<relayer_private_key>
CONTRACT_ADDRESS=<deployed_contract_address>
PERPLEXITY_API_KEY=<your_perplexity_key>
```

---

## Jury Pitch (from Perplexity)

> "We use a cryptographically-signed relayer to deliver external AI results to our prediction market smart contract on BNB Chain Testnet. This pragmatic hybrid approach ensures a working and auditable demo within 24 hours, with a clear and upgradeable path toward future decentralized oracles as soon as the ecosystem is ready."

---

## Advantages for Hackathon

✅ **Works on BNB Chain Testnet** (requirement met)
✅ **4-6 hour implementation** (timeline feasible)
✅ **90% success probability** (high confidence)
✅ **Full custom compute** (unlimited flexibility)
✅ **Verifiable on-chain** (events, signatures, logs)
✅ **Upgradeable architecture** (can swap to decentralized later)
✅ **Transparent code** (open source, auditable)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Relayer downtime | Keep logic simple, add health checks |
| Bugs in JS parsing | Extensive testing, error handling |
| Transaction failures | Retry logic, gas estimation |
| API rate limits | Caching, request throttling |

---

## Timeline

| Task | Duration | Status |
|------|----------|--------|
| Smart Contract | 30 min | ✅ In Progress |
| Relayer Setup | 1 hr | ⏳ Next |
| Event Listener | 1 hr | ⏳ Pending |
| Perplexity Integration | 1.5 hrs | ⏳ Pending |
| Contract Interaction | 1.5 hrs | ⏳ Pending |
| Testing | 1 hr | ⏳ Pending |
| **TOTAL** | **6.5 hrs** | |

---

## Success Criteria

✅ Contract deployed on BNB Testnet
✅ Relayer listening for events
✅ Perplexity API responding correctly
✅ Results stored on-chain
✅ Frontend displays AI-verified answers
✅ Demo video ready
✅ Code on GitHub
✅ Documentation complete

---

**Status: Implementation starting NOW!** 🚀

