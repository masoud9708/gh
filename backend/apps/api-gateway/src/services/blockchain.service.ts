import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ethers } from 'ethers';

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider;

  async onModuleInit() {
    this.logger.log('Initializing BlockchainService...');
    // Replace with actual setup later
  }

  getProvider() {
    return this.provider;
  }
}
