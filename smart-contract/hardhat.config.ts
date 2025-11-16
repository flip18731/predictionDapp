import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const BNB_RPC_URL = process.env.BNB_RPC_URL || "";
const PRIVATE_KEY_RAW = process.env.DEPLOYER_PRIVATE_KEY || "";
// Remove 0x prefix if present and validate length (64 hex chars = 32 bytes)
const PRIVATE_KEY = PRIVATE_KEY_RAW.startsWith("0x") 
  ? PRIVATE_KEY_RAW.slice(2) 
  : PRIVATE_KEY_RAW;
const FUNCTIONS_SUBSCRIPTION_ID = process.env.FUNCTIONS_SUBSCRIPTION_ID
  ? parseInt(process.env.FUNCTIONS_SUBSCRIPTION_ID, 10)
  : 0;
const FUNCTIONS_DON_ID = process.env.FUNCTIONS_DON_ID ||
  "0x66756e2d6c696e6b2d3100000000000000000000000000000000000000000000"; // fun-link-1 default
const FUNCTIONS_GAS_LIMIT = process.env.FUNCTIONS_GAS_LIMIT
  ? parseInt(process.env.FUNCTIONS_GAS_LIMIT, 10)
  : 300000;
const FUNCTIONS_ROUTER = process.env.FUNCTIONS_ROUTER || "";

// Validate private key format (must be 64 hex characters = 32 bytes)
const isValidPrivateKey = PRIVATE_KEY.length === 64 && /^[0-9a-fA-F]+$/.test(PRIVATE_KEY);

if (!isValidPrivateKey && PRIVATE_KEY.length > 0) {
  console.warn(`⚠️  WARNING: Private key is invalid (length: ${PRIVATE_KEY.length}, expected: 64). Deployment will fail.`);
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.23",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    bnb_testnet: {
      url: BNB_RPC_URL,
      chainId: 97,
      accounts: isValidPrivateKey ? [PRIVATE_KEY] : (PRIVATE_KEY.length > 0 ? [] : undefined)
    }
  },
  etherscan: {
    apiKey: {
      bscTestnet: process.env.BSCSCAN_API_KEY || ""
    }
  },
  paths: {
    sources: "contracts",
    tests: "test",
    cache: "cache",
    artifacts: "artifacts"
  },
  mocha: {
    timeout: 40000
  }
};

export default config;
