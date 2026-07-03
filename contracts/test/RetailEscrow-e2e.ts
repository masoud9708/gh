import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";

describe("RetailEscrow E2E", function () {
  let forwarder: Contract;
  let usdt: Contract;
  let retailEscrow: Contract;
  let deployer: any, buyer: any, seller: any, driver: any, platform: any;

  before(async function () {
    [deployer, buyer, seller, driver, platform] = await ethers.getSigners();

    const Forwarder = await ethers.getContractFactory("Forwarder");
    forwarder = await Forwarder.deploy();
    await forwarder.waitForDeployment();

    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    usdt = await MockUSDT.deploy();
    await usdt.waitForDeployment();

    const RetailEscrow = await ethers.getContractFactory("RetailEscrow");
    retailEscrow = await RetailEscrow.deploy(
      await forwarder.getAddress(),
      await usdt.getAddress(),
      platform.address
    );
    await retailEscrow.waitForDeployment();

    // Mint and approve tokens
    await usdt.mint(buyer.address, ethers.parseUnits("1000", 18));
    await usdt.connect(buyer).approve(await retailEscrow.getAddress(), ethers.parseUnits("1000", 18));
  });

  it("Should complete the full retail lifecycle", async function () {
    const orderId = "R-100";
    const amount = ethers.parseUnits("100", 18);
    const shipping = ethers.parseUnits("10", 18);
    const total = amount + shipping;

    const deliveryCode = "DELIVERY123";
    const deliveryHash = ethers.keccak256(ethers.toUtf8Bytes(deliveryCode));

    // 1. CREATE
    await retailEscrow.connect(buyer).createOrder(orderId, seller.address, amount, shipping, deliveryHash);
    let order = await retailEscrow.orders(orderId);
    expect(order.state).to.equal(1n); // CREATED

    // 2. FUND
    await retailEscrow.connect(buyer).fund(orderId);
    order = await retailEscrow.orders(orderId);
    expect(order.state).to.equal(2n); // FUNDED

    // 3. ASSIGN DRIVER
    await retailEscrow.connect(seller).assignDriver(orderId, driver.address);
    order = await retailEscrow.orders(orderId);
    expect(order.driver).to.equal(driver.address);

    // 4. DELIVER
    await retailEscrow.connect(driver).markDelivered(orderId);
    order = await retailEscrow.orders(orderId);
    expect(order.state).to.equal(3n); // DELIVERED

    // 5. CONFIRM & RELEASE
    const sellerBalanceBefore = await usdt.balanceOf(seller.address);
    const driverBalanceBefore = await usdt.balanceOf(driver.address);
    const platformBalanceBefore = await usdt.balanceOf(platform.address);

    await retailEscrow.connect(buyer).confirmDelivery(orderId, deliveryCode);

    order = await retailEscrow.orders(orderId);
    expect(order.state).to.equal(4n); // CONFIRMED

    const sellerBalanceAfter = await usdt.balanceOf(seller.address);
    const driverBalanceAfter = await usdt.balanceOf(driver.address);
    const platformBalanceAfter = await usdt.balanceOf(platform.address);

    // Platform gets 2% of 100 = 2 USDT
    expect(platformBalanceAfter - platformBalanceBefore).to.equal(ethers.parseUnits("2", 18));
    // Seller gets 98% of 100 = 98 USDT
    expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(ethers.parseUnits("98", 18));
    // Driver gets 100% of shipping = 10 USDT
    expect(driverBalanceAfter - driverBalanceBefore).to.equal(ethers.parseUnits("10", 18));
  });
});
