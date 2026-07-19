import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ethers } from 'ethers';

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;

  async onModuleInit() {
    this.logger.log('Initializing BlockchainService...');

    const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
    // Use Hardhat default test key #0 for local dev only
    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey && process.env.NODE_ENV === 'production') {
      throw new Error('PRIVATE_KEY environment variable is required in production');
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', this.provider);

    this.logger.log(`Wallet initialized with address: ${this.wallet.address}`);
  }

  getProvider() {
    return this.provider;
  }

  getWallet() {
    return this.wallet;
  }
}
