# Clarity Protocol – Seedify Prediction Markets Hackathon

This workspace captures the strategy, architecture, and execution plan for delivering **Clarity Protocol**, an AI-assisted prediction market oracle purpose-built to answer CZ's mandate and the BNB Chain "RFP for Prediction Market Oracle".

## Repository Structure

- `docs/clarity_protocol_strategy.md` – comprehensive narrative covering the win strategy, MVP design, demo plan, sprint schedule, and post-hackathon roadmap.
- `smart-contract/` – Hardhat workspace containing `ClarityOracle.sol`, deployment scripts, and tests.
- `chainlink/functions/clarityEvidence.js` – Chainlink Functions JavaScript executed by the DON to fetch AI-backed evidence.

## How to Use This Repo

1. Start with the strategy document to internalize the judging criteria, wow-moment demo script, and four-day execution plan.
2. Open `smart-contract/`, copy `.env.example` → `.env`, and populate RPC URL, private key, Chainlink Functions subscription, DON ID, router, and preferred gas limit (a ready-to-edit `.env` now lives in the folder—just replace the placeholders).
3. Install dependencies via `npm install` (run inside `smart-contract/`). If the command appears stuck, temporarily force the registry + shorter timeouts to surface progress:

```powershell
cmd /c "cd /d c:\Users\Philipp\Downloads\CodingProjekteBBC\Prediction\smart-contract && npm config set registry https://registry.npmjs.org && npm install --fetch-timeout=10000 --fetch-retries=1"
```

Let the process finish—earlier hangs were caused by cancelling at the “Batchvorgang abbrechen” prompt.
4. Compile & test with `npm run build` / `npm test`, then deploy using `npm run deploy:testnet` once the Chainlink subscription and router are funded.
5. Track deliverables (contract address, Chainlink job ID, frontend URL, demo video) inside the strategy document as they become available.

### Frontend (`dapp/`) Quickstart

1. Copy `.env.local.example` → `.env.local` (already created for you) and replace the placeholders:
   - `NEXT_PUBLIC_CLARITY_CONTRACT_ADDRESS` – the deployed `ClarityOracle` on BNB Chain testnet.
   - `NEXT_PUBLIC_BNB_RPC_URL` – HTTPS RPC endpoint (publicnode default works; feel free to point at your provider).
   - `NEXT_PUBLIC_CHAIN_ID` – usually `97` for testnet.
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` – grab from [cloud.walletconnect.com](https://cloud.walletconnect.com) so ConnectKit can initialize.
2. Install dependencies via `npm install` (inside `dapp/`).
3. Sanity check with `npm run lint`; build with `npm run build`; start the dev server using `npm run dev` and visit `http://localhost:3000`.
4. Once the env vars contain live values, the “Request resolution” flow will hit your deployed oracle via wagmi/viem.

### Chainlink Functions Prep

1. Provision Perplexity/Gemini API keys and drop them into the Chainlink Functions secrets manager when creating your DON job.
2. Fund the Functions subscription with LINK + gas, note the `subscriptionId`, and update `smart-contract/.env`.
3. Use the Chainlink Functions toolkit (or Hardhat task) to simulate one round trip before demo day; record a requestId + fulfillment tx hash for reference.

## Next Actions Snapshot

- Secure Perplexity/Gemini + Chainlink credentials.
- Deploy `ClarityOracle.sol` v0.1 on BNB Chain testnet and log address in the strategy doc.
- Implement the Chainlink Functions bridge and wire the frontend for the Golden Path demo.
- Capture npm/yarn install logs if issues persist so we can diagnose without cancelling the process.

Happy BUIDLing – the AI evidence chain starts here.
