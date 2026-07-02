import { expect } from "chai";
import { ethers } from "hardhat";

describe("FreightEscrow", function () {
  it("Should deploy successfully", async function () {
    const Forwarder = await ethers.getContractFactory("Forwarder");
    const forwarder = await Forwarder.deploy();

    expect(await forwarder.getAddress()).to.be.properAddress;
  });
});
