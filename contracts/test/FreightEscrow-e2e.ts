import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";

describe("FreightEscrow E2E", function () {
  let forwarder: Contract;
  let usdt: Contract;
  let freightEscrow: Contract;
  let deployer: any, shipper: any, driver: any, platform: any;

  before(async function () {
    [deployer, shipper, driver, platform] = await ethers.getSigners();

    const Forwarder = await ethers.getContractFactory("Forwarder");
    forwarder = await Forwarder.deploy();
    await forwarder.waitForDeployment();

    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    usdt = await MockUSDT.deploy();
    await usdt.waitForDeployment();

    const FreightEscrow = await ethers.getContractFactory("FreightEscrow");
    freightEscrow = await FreightEscrow.deploy(
      await forwarder.getAddress(),
      await usdt.getAddress(),
      platform.address
    );
    await freightEscrow.waitForDeployment();

    // Mint and approve tokens
    await usdt.mint(shipper.address, ethers.parseUnits("1000", 18));
    await usdt.connect(shipper).approve(await freightEscrow.getAddress(), ethers.parseUnits("1000", 18));

    await usdt.mint(driver.address, ethers.parseUnits("1000", 18));
    await usdt.connect(driver).approve(await freightEscrow.getAddress(), ethers.parseUnits("1000", 18));
  });

  it("Should complete the full freight lifecycle", async function () {
    const freightId = "F-100";
    const cargoValue = ethers.parseUnits("100", 18);
    const freightAmount = ethers.parseUnits("50", 18);

    const pickupCode = "PICKUP123";
    const deliveryCode = "DELIVERY456";
    const pickupHash = ethers.keccak256(ethers.toUtf8Bytes(pickupCode));
    const deliveryHash = ethers.keccak256(ethers.toUtf8Bytes(deliveryCode));
    const emptyHash = ethers.ZeroHash;

    // 1. CREATE
    await freightEscrow.connect(shipper).createFreight(freightId, pickupHash, deliveryHash, cargoValue);
    let freight = await freightEscrow.freights(freightId);
    expect(freight.state).to.equal(1n); // CREATED

    // 2. FUND
    await freightEscrow.connect(shipper).fund(freightId, freightAmount);
    freight = await freightEscrow.freights(freightId);
    expect(freight.state).to.equal(2n); // FUNDED

    // 3. ACCEPT (Driver puts up collateral)
    await freightEscrow.connect(driver).acceptJob(freightId, cargoValue);
    freight = await freightEscrow.freights(freightId);
    expect(freight.state).to.equal(3n); // ACCEPTED

    // 4. PICKUP
    await freightEscrow.connect(driver).pickUp(freightId, pickupCode, emptyHash, "https://photo");
    freight = await freightEscrow.freights(freightId);
    expect(freight.state).to.equal(4n); // PICKED_UP

    // 5. IN TRANSIT
    await freightEscrow.connect(driver).startTransit(freightId, Math.floor(Date.now() / 1000) + 86400, 100);
    freight = await freightEscrow.freights(freightId);
    expect(freight.state).to.equal(5n); // IN_TRANSIT

    // 6. DELIVER
    await freightEscrow.connect(driver).markDelivered(freightId);
    freight = await freightEscrow.freights(freightId);
    expect(freight.state).to.equal(6n); // DELIVERED

    // 7. CONFIRM & RELEASE
    const driverBalanceBefore = await usdt.balanceOf(driver.address);
    const platformBalanceBefore = await usdt.balanceOf(platform.address);

    await freightEscrow.connect(shipper).confirmDelivery(freightId, deliveryCode);

    freight = await freightEscrow.freights(freightId);
    expect(freight.state).to.equal(8n); // RELEASED

    const driverBalanceAfter = await usdt.balanceOf(driver.address);
    const platformBalanceAfter = await usdt.balanceOf(platform.address);

    // Platform gets 2% of 50 = 1 USDT
    expect(platformBalanceAfter - platformBalanceBefore).to.equal(ethers.parseUnits("1", 18));
    // Driver gets collateral (100) + 98% of 50 (49) = 149 USDT
    expect(driverBalanceAfter - driverBalanceBefore).to.equal(ethers.parseUnits("149", 18));
  });
});
