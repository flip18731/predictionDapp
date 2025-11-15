import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const BNB_RPC_URL = process.env.BNB_RPC_URL || "";
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
const FUNCTIONS_SUBSCRIPTION_ID = process.env.FUNCTIONS_SUBSCRIPTION_ID
  ? parseInt(process.env.FUNCTIONS_SUBSCRIPTION_ID, 10)
  : 0;
const FUNCTIONS_DON_ID = process.env.FUNCTIONS_DON_ID ||
  "0x66756e2d6c696e6b2d3100000000000000000000000000000000000000000000"; // fun-link-1 default
const FUNCTIONS_GAS_LIMIT = process.env.FUNCTIONS_GAS_LIMIT
  ? parseInt(process.env.FUNCTIONS_GAS_LIMIT, 10)
  : 300000;
const FUNCTIONS_ROUTER = process.env.FUNCTIONS_ROUTER || "";

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
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
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
