import { expect } from "chai";
import { ethers } from "hardhat";
import "@nomicfoundation/hardhat-chai-matchers";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("ClarityOracle", function () {
  async function deployFixture() {
    const [deployer] = await ethers.getSigners();
    const router = deployer.address; // placeholder for local testing
    const subscriptionId = 1n;
    const donId = ethers.encodeBytes32String("fun-test-1");
    const gasLimit = 300000;

    const Factory = await ethers.getContractFactory("ClarityOracleHarness");
    const contract = await Factory.deploy(router, subscriptionId, donId, gasLimit);
    await contract.waitForDeployment();

    return { contract, deployer };
  }

  it("reverts when source code is missing", async function () {
    const { contract } = await loadFixture(deployFixture);

    await expect(contract.requestResolution("Will CZ tweet today?"))
      .to.be.revertedWithCustomError(contract, "SourceNotConfigured");
  });

  it("persists fulfillment payloads", async function () {
    const { contract, deployer } = await loadFixture(deployFixture);
    const question = "Will Seedify winners be announced before Nov 22?";
    const requestId = ethers.encodeBytes32String("req-1");

    await contract.seedRequest(requestId, deployer.address, question);

    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const response = abiCoder.encode(
      ["string", "string", "string[]"],
      [
        "Supported",
        "Official schedule lists judging 18-21 Nov, implying announcement before 22 Nov.",
        ["https://dorahacks.io/hackathon/predictionmarketshackathon/buidl"]
      ]
    );

    await expect(contract.mockFulfill(requestId, response, "0x"))
      .to.emit(contract, "ResolutionFulfilled")
      .withArgs(requestId, "Supported", "Official schedule lists judging 18-21 Nov, implying announcement before 22 Nov.", ["https://dorahacks.io/hackathon/predictionmarketshackathon/buidl"]);

    const stored = await contract.getResolution(requestId);
    expect(stored.question).to.equal(question);
    expect(stored.verdict).to.equal("Supported");
    expect(stored.summary).to.include("Official schedule");
    expect(stored.sources.length).to.equal(1);
    expect(stored.sources[0]).to.contain("dorahacks");
    expect(stored.requester).to.equal(deployer.address);
    expect(stored.timestamp).to.be.greaterThan(0);
  });
});
