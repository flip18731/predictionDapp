import { ethers } from "ethers";

/**
 * Generates a new random private key for testing purposes.
 * 
 * ⚠️ WARNING: Only use this for TESTNET!
 * Never use generated keys for mainnet or with real funds!
 * 
 * Usage:
 *   npx ts-node scripts/generatePrivateKey.ts
 *   or
 *   npx hardhat run scripts/generatePrivateKey.ts
 */

async function main() {
  // Generate a new random wallet
  const wallet = ethers.Wallet.createRandom();
  
  console.log("\n=== New Wallet Generated (TESTNET ONLY!) ===\n");
  console.log("Private Key (64 chars, no 0x):");
  console.log(wallet.privateKey.slice(2)); // Remove 0x prefix
  console.log("\nPrivate Key (66 chars, with 0x):");
  console.log(wallet.privateKey);
  console.log("\nAddress:");
  console.log(wallet.address);
  console.log("\n=== IMPORTANT ===");
  console.log("1. Copy the private key (64 chars without 0x)");
  console.log("2. Add it to your .env file:");
  console.log("   DEPLOYER_PRIVATE_KEY=<paste_key_here>");
  console.log("3. Get testnet BNB from faucet:");
  console.log("   https://testnet.bnbchain.org/faucet-smart");
  console.log("4. NEVER use this key for mainnet!\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

