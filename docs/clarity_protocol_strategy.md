# Clarity Protocol – Seedify Prediction Markets Hackathon Strategy

## Executive Summary
- **Mandate alignment**: Direct response to CZ's 17 Oct 2025 call for a "prediction-market-specific oracle" and the BNB Chain "RFP for Prediction Market Oracle".
- **Problem to solve**: Subjective, slow, plutocratic market resolutions (UMA/Kleros) block the next wave of BNB prediction markets.
- **Solution**: Clarity Protocol – a hybrid, AI-assisted oracle that delivers citeable, on-chain evidence in ~20 seconds via a custom relayer and Perplexity AI integration.
- **MVP scope**: One Solidity oracle contract + one Node.js relayer backend + a minimal Next.js dApp, all running on BNB Chain testnet, optimized for a 4-day sprint.
- **Outcome**: Provide the infrastructure that 20+ existing PM dApps on BNB Chain can consume, showcasing a live "AI evidence chain" demo that mirrors CZ's own tweet.

## 1. Context & Strategic Imperatives
### 1.1 The CZ Mandate & BNB Chain RFP
1. CZ publicly reviewed "20+ prediction market startups" on BNB Chain – signaling saturation for net-new PM front-ends.
2. He highlighted an **opportunity for a prediction-market-specific oracle**; the BNB core team followed with an RFP demanding: (a) resolution of arbitrary real-world events, (b) optimistic finality, (c) hybrid architecture, (d) AI-assisted proposing with evidence sourced from news/APIs/social media.
3. Winning the hackathon therefore hinges on delivering the RFP's checklist, not another AMM.

### 1.2 Market Gap vs UMA & Kleros
| Pain Point | UMA/Kleros Status Quo | Clarity Protocol Response |
| --- | --- | --- |
| Latency | 48–96h dispute windows | AI + custom relayer round trip in ~20s |
| Ambiguity | Language-driven disputes (e.g., "Trump Wall") | LLM prompt engineered for semantic disambiguation with textual quotes |
| Governance | Token-weighted, plutocratic | Evidence-weighted, source-citeable resolutions stored on-chain |
| User Trust | Expensive disputes & whale manipulation risk | Deterministic audit trail: question → AI proof → immutable storage |

## 2. Winning Strategy Pillars
1. **RFP Traceability** – every MVP component maps to a stated requirement (see Appendix A).
2. **AI as Core Utility** – AI collects sources, generates structured JSON verdicts (Supported/Refuted/Unclear) with URLs and quote snippets.
3. **Hybrid Architecture** – Solidity contract ↔ Custom Relayer ↔ Perplexity AI evidence agent.
4. **Optimistic Finality** – single trusted relayer (the AI) for MVP; disputes are deferred to post-hackathon roadmap but referenced as a next step.
5. **Sponsor Narrative** – Live demo question uses CZ's own tweet, proving we solved the sponsor's problem.

## 3. MVP Architecture
### 3.1 On-Chain: `RelayerOracle.sol`
- Emits `ResolutionRequested` events when users call `requestResolution(string marketQuestion)`.
- Stores `requestId → Resolution` structs (verdict, summary, sources array, timestamp, requester, relayer address).
- `fulfillResolution(bytes32 requestId, string verdict, string summary, string[] sources)` gated by the trusted relayer address.

### 3.2 Relayer Backend (Node.js)
- Event listener monitors `ResolutionRequested` events from the contract.
- Calls Perplexity AI via HTTPS with a tightly scoped prompt demanding JSON `{ verdict, summary, sources[] }`.
- Validates schema, parses response, and calls `fulfillResolution()` on the contract.

### 3.3 AI Evidence Engine
- Prompt template ensures: deterministic tone, citeable URLs, quote snippets, and structured verdicts.
- Error handling and retry logic for API failures.
- Logging for audit (off-chain, referenced in README for transparency).

### 3.4 Frontend (Next.js + wagmi/viem + ConnectKit)
Features critical for demo:
1. Wallet connect → auto switch to BNB Chain testnet.
2. Question input + "Resolve" CTA → triggers contract call.
3. Status indicators ("AI gathering evidence...").
4. Result card pulling on-chain bytes, decoding into human-readable verdict + clickable proofs.
5. Link-out to BscScan tx for immutability proof.

### 3.5 Non-Goals (MVP Focus)
- No AMM / liquidity pools.
- No token economics.
- No decentralized dispute network (documented in roadmap).

## 4. Demo Narrative ("AI Evidence Chain" Wow Moment)
1. **Problem framing (15s)** – highlight UMA latency & whale manipulation.
2. **Live market question (30s)** – e.g., "Did CZ’s 17 Oct tweet include the word 'opportunity'?" entered in the dApp.
3. **Resolution journey (60s)** – walk through contract tx → Relayer event → AI call (spinner on UI, show logs in console tab if needed).
4. **Reveal (15s)** – on-chain data renders: verdict = "Supported", summary blurb, citations (Twitter URL) + BscScan tx proof.
5. **Close (15s)** – reiterate "20 seconds vs 48 hours" and that this is the requested oracle infra for BNB Chain.

## 5. Tactical 4-Day Sprint Plan
| Day | Focus | Tasks | Milestone |
| --- | --- | --- | --- |
| Thu (Day 1) | Environment & Contract | API keys, faucet funding, `ClarityOracle.sol` v0.1 deploy via Remix | Contract live on BNB testnet |
| Fri (Day 2) | Chainlink Roundtrip | Build/test Functions script, mock AI response, verify fulfill callback | On-chain ↔ off-chain ↔ on-chain loop proven |
| Sat (Day 3) | Frontend Integration | Next.js shell, wagmi wiring, end-to-end test with real AI call | Golden-path demo functional |
| Sun (Day 4) | Polish & Submission | UI styling, script demo video, record Loom/OBS, prep GitHub & DoraHacks submission | Final package ready before deadline |

## 6. Post-Hackathon Roadmap

### Implementation Log (kept up to date)

- ✅ Hardhat workspace scaffolded in `smart-contract/` with `RelayerOracle.sol`, tests, and deployment script.
- ✅ Relayer backend implemented in `relayer/` directory with event listener, Perplexity integration, and contract interaction.
- ✅ Install dependencies (`npm install` inside `smart-contract/` and `relayer/`).
- ✅ Configure `.env` values (RPC, private keys, contract address, Perplexity API key).
- ✅ Deployed to BNB Chain testnet at `0x3348c34F4F62c464BDfDb83AFa84DB178C433299`.

1. **Multi-Relayer Network** – federation of independent relayers competing on speed/accuracy.
2. **Dispute Layer** – autonomous bot network to flag anomalies + Kleros-style human fallback handling <2% of cases.
3. **Sustainable Revenue** – per-resolution fee (e.g., 0.1% of market volume) or SaaS-style subscription for PM dApps.
4. **Account Abstraction Hooks** – Paymaster compatibility so partner dApps can sponsor gas / resolution fees.
5. **Observability & SLAs** – publish dashboards tracking time-to-resolution, accuracy, dispute rate; key for Seedify/YZi follow-on funding.

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| AI hallucination | Incorrect verdict on-chain | Enforce schema validation, include confidence thresholds, log raw AI response for audit |
| API downtime | Resolution delays | Dual-provider fallback + cached responses when question repeats |
| Gas limits on large payloads | Failed fulfillment | Enforce max sources (e.g., 3), compress text, use IPFS for extended evidence |
| Demo fragility | Poor judging impression | Pre-seed script, record dry run, maintain mock override in case APIs fail live |

## 8. Submission Checklist

- ✅ BNB testnet contract address + verified source on BscScan.
- ✅ Relayer backend source code in repo (`relayer/` directory).
- ✅ Frontend repo (Next.js) with env template and deploy instructions.
- ✅ README quickstart + architecture diagram snippet.
- ✅ 2-minute demo script in DEPLOYMENT_COMPLETE.md.
- ✅ Appendix A requirement traceability.

## Appendix A – RFP Requirement Traceability

| RFP Item | Implementation Hook |
| --- | --- |
| Resolve "any real-world event" | Free-form `marketQuestion` string + AI web search |
| Optimistic finality | Single trusted relayer + configurable dispute latency (future) |
| Hybrid architecture | On-chain contract + off-chain relayer + AI APIs |
| AI-assisted proposing & evidence | Perplexity AI integration returns verdict + citations |
| Evidence from news/APIs/social | Prompt mandates multiple independent URLs and quote snippets |

---
**Next Steps Today**: lock API keys, deploy v0.1 contract, script Chainlink Function, start logging everything for the demo narrative.
