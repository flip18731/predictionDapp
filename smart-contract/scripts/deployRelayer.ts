import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Deploys RelayerOracle contract to BNB Chain Testnet
 */
async function main() {
  const relayerAddress = process.env.RELAYER_ADDRESS;

  if (!relayerAddress) {
    throw new Error("RELAYER_ADDRESS not set in .env");
  }

  console.log("=== Deploying RelayerOracle ===");
  console.log("");
  console.log("Trusted Relayer:", relayerAddress);
  console.log("");

  const [signer] = await ethers.getSigners();
  console.log("Deploying from:", signer.address);
  console.log("");

  const RelayerOracle = await ethers.getContractFactory("RelayerOracle");
  const contract = await RelayerOracle.deploy(relayerAddress);

  await contract.waitForDeployment();

  const address = await contract.getAddress();

  console.log("✅ RelayerOracle deployed to:", address);
  console.log("");
  console.log("Next steps:");
  console.log("1. Update relayer/.env with CONTRACT_ADDRESS=" + address);
  console.log("2. Start relayer: cd relayer && npm start");
  console.log("3. Update frontend with new contract address");
  console.log("");
  console.log("BscScan:");
  console.log(`https://testnet.bscscan.com/address/${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

