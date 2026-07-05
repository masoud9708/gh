import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy Forwarder
  const Forwarder = await ethers.getContractFactory("Forwarder");
  const forwarder = await Forwarder.deploy();
  await forwarder.waitForDeployment();
  console.log("Forwarder deployed to:", await forwarder.getAddress());

  // 2. Deploy MockUSDT
  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const usdt = await MockUSDT.deploy();
  await usdt.waitForDeployment();
  console.log("MockUSDT deployed to:", await usdt.getAddress());

  // 3. Deploy FreightEscrow
  const FreightEscrow = await ethers.getContractFactory("FreightEscrow");
  const platformWallet = deployer.address; // For simplicity in local dev
  const freightEscrow = await FreightEscrow.deploy(
    await forwarder.getAddress(),
    await usdt.getAddress(),
    platformWallet
  );
  await freightEscrow.waitForDeployment();
  console.log("FreightEscrow deployed to:", await freightEscrow.getAddress());

  // 4. Deploy RetailEscrow
  const RetailEscrow = await ethers.getContractFactory("RetailEscrow");
  const retailEscrow = await RetailEscrow.deploy(
    await forwarder.getAddress(),
    await usdt.getAddress(),
    platformWallet
  );
  await retailEscrow.waitForDeployment();
  console.log("RetailEscrow deployed to:", await retailEscrow.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
