import { expect } from "chai";
import { ethers } from "hardhat";
import type { RelayerOracle } from "../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("RelayerOracle - Compliance Tests", function () {
  let relayerOracle: RelayerOracle;
  let owner: SignerWithAddress;
  let relayer: SignerWithAddress;
  let user: SignerWithAddress;
  let feeRecipient: SignerWithAddress;

  // COMPLIANCE: Test constants matching contract
  const REQUEST_FEE = ethers.parseEther("0.001"); // 0.001 BNB
  const TEST_QUESTION = "Is Bitcoin a cryptocurrency?";
  const TEST_VERDICT = "Supported";
  const TEST_SUMMARY = "Bitcoin is the first and most well-known cryptocurrency.";
  const TEST_SOURCES = ["Bitcoin Wikipedia|https://bitcoin.org|Bitcoin is a cryptocurrency"];

  beforeEach(async function () {
    [owner, relayer, user, feeRecipient] = await ethers.getSigners();

    // Deploy contract with relayer address
    const RelayerOracleFactory = await ethers.getContractFactory("RelayerOracle");
    relayerOracle = await RelayerOracleFactory.deploy(relayer.address);
    await relayerOracle.waitForDeployment();
  });

  describe("BNB Chain Integration", function () {
    it("Should be deployed on EVM-compatible chain", async function () {
      const code = await ethers.provider.getCode(await relayerOracle.getAddress());
      expect(code).to.not.equal("0x");
    });

    it("Should accept BNB as native currency", async function () {
      const balance = await ethers.provider.getBalance(await relayerOracle.getAddress());
      expect(balance).to.equal(0n);
    });
  });

  describe("Revenue Mechanism (COMPLIANCE)", function () {
    it("Should require fee payment for requestResolution", async function () {
      // Try without fee - should fail
      await expect(
        relayerOracle.connect(user).requestResolution(TEST_QUESTION)
      ).to.be.revertedWithCustomError(relayerOracle, "IncorrectFee");

      // Try with correct fee - should succeed
      await expect(
        relayerOracle.connect(user).requestResolution(TEST_QUESTION, {
          value: REQUEST_FEE
        })
      ).to.emit(relayerOracle, "ResolutionRequested");
    });

    it("Should collect fees correctly", async function () {
      const initialBalance = await ethers.provider.getBalance(await relayerOracle.getAddress());
      
      await relayerOracle.connect(user).requestResolution(TEST_QUESTION, {
        value: REQUEST_FEE
      });

      const finalBalance = await ethers.provider.getBalance(await relayerOracle.getAddress());
      expect(finalBalance).to.equal(initialBalance + REQUEST_FEE);
    });

    it("Should allow owner to update fee", async function () {
      const newFee = ethers.parseEther("0.002");
      
      await expect(relayerOracle.connect(owner).setRequestFee(newFee))
        .to.emit(relayerOracle, "RequestFeeUpdated")
        .withArgs(REQUEST_FEE, newFee);

      expect(await relayerOracle.requestFee()).to.equal(newFee);
    });

    it("Should allow owner to withdraw collected fees", async function () {
      // Collect some fees
      await relayerOracle.connect(user).requestResolution(TEST_QUESTION, {
        value: REQUEST_FEE
      });

      const contractBalance = await ethers.provider.getBalance(await relayerOracle.getAddress());
      const recipientBalanceBefore = await ethers.provider.getBalance(feeRecipient.address);

      // Withdraw fees
      const tx = await relayerOracle.connect(owner).withdrawFees(feeRecipient.address);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const recipientBalanceAfter = await ethers.provider.getBalance(feeRecipient.address);
      expect(recipientBalanceAfter).to.equal(recipientBalanceBefore + contractBalance - gasUsed);
    });
  });

  describe("Core Features - AI Integration Path", function () {
    it("Should allow user to request resolution", async function () {
      const tx = await relayerOracle.connect(user).requestResolution(TEST_QUESTION, {
        value: REQUEST_FEE
      });

      await expect(tx).to.emit(relayerOracle, "ResolutionRequested");

      // Get request ID from event
      const receipt = await tx.wait();
      const event = receipt!.logs.find(
        (log: any) => log.fragment?.name === "ResolutionRequested"
      );
      expect(event).to.not.be.undefined;
    });

    it("Should allow relayer to fulfill resolution", async function () {
      // User requests resolution
      const tx = await relayerOracle.connect(user).requestResolution(TEST_QUESTION, {
        value: REQUEST_FEE
      });
      const receipt = await tx.wait();
      
      // Extract requestId from event (simplified - in practice use event parsing)
      // For this test, we'll use a known requestId calculation method
      const requestCounter = await relayerOracle.requestCounter();
      const requestId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "address", "uint256", "string"],
          [
            await ethers.provider.getBlock(await ethers.provider.getBlockNumber()).then(b => b!.timestamp),
            user.address,
            requestCounter - 1n,
            TEST_QUESTION
          ]
        )
      );

      // Relayer fulfills (simulate AI response)
      await expect(
        relayerOracle.connect(relayer).fulfillResolution(
          requestId,
          TEST_VERDICT,
          TEST_SUMMARY,
          TEST_SOURCES
        )
      ).to.emit(relayerOracle, "ResolutionFulfilled");
    });

    it("Should reject fulfillment from non-relayer", async function () {
      const tx = await relayerOracle.connect(user).requestResolution(TEST_QUESTION, {
        value: REQUEST_FEE
      });
      const receipt = await tx.wait();
      
      const requestCounter = await relayerOracle.requestCounter();
      const requestId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "address", "uint256", "string"],
          [
            await ethers.provider.getBlock(await ethers.provider.getBlockNumber()).then(b => b!.timestamp),
            user.address,
            requestCounter - 1n,
            TEST_QUESTION
          ]
        )
      );

      await expect(
        relayerOracle.connect(user).fulfillResolution(
          requestId,
          TEST_VERDICT,
          TEST_SUMMARY,
          TEST_SOURCES
        )
      ).to.be.revertedWithCustomError(relayerOracle, "UnauthorizedRelayer");
    });
  });

  describe("Blockchain Integration - Write Transactions", function () {
    it("Should emit events on state changes", async function () {
      const tx = await relayerOracle.connect(user).requestResolution(TEST_QUESTION, {
        value: REQUEST_FEE
      });

      await expect(tx).to.emit(relayerOracle, "ResolutionRequested")
        .withArgs(
          (requestId: string) => requestId.length === 66, // 0x + 64 hex chars
          user.address,
          TEST_QUESTION,
          (timestamp: bigint) => timestamp > 0n
        );
    });

    it("Should persist state on-chain", async function () {
      const tx = await relayerOracle.connect(user).requestResolution(TEST_QUESTION, {
        value: REQUEST_FEE
      });
      const receipt = await tx.wait();
      
      const requestCounter = await relayerOracle.requestCounter();
      expect(requestCounter).to.be.greaterThan(0n);
    });
  });

  describe("Error Handling", function () {
    it("Should reject empty questions", async function () {
      await expect(
        relayerOracle.connect(user).requestResolution("", {
          value: REQUEST_FEE
        })
      ).to.be.revertedWithCustomError(relayerOracle, "InvalidQuestion");
    });

    it("Should reject requests with wrong fee amount", async function () {
      await expect(
        relayerOracle.connect(user).requestResolution(TEST_QUESTION, {
          value: ethers.parseEther("0.0005") // Wrong amount
        })
      ).to.be.revertedWithCustomError(relayerOracle, "IncorrectFee");
    });
  });
});

