import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const router = process.env.FUNCTIONS_ROUTER;
  const subscriptionId = process.env.FUNCTIONS_SUBSCRIPTION_ID;
  const donId = process.env.FUNCTIONS_DON_ID;
  const fulfillGasLimit = process.env.FUNCTIONS_GAS_LIMIT;

  if (!router || !subscriptionId || !donId || !fulfillGasLimit) {
    throw new Error("Missing required env vars. Check FUNCTIONS_* values.");
  }

  const ClarityOracle = await ethers.getContractFactory("ClarityOracle");
  const contract = await ClarityOracle.deploy(
    router,
    BigInt(subscriptionId),
    donId,
    Number(fulfillGasLimit)
  );

  await contract.waitForDeployment();

  console.log("ClarityOracle deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
