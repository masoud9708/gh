import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { ethers } from 'ethers';

const FORWARDER_ABI = [
  "function execute(tuple(address from, address target, uint256 value, uint256 nonce, bytes data, uint256 deadline) req, bytes signature) public payable returns (bool, bytes)"
];

@Injectable()
export class RelayerService {
  private readonly logger = new Logger(RelayerService.name);

  constructor(private readonly blockchainService: BlockchainService) {}

  async relayTransaction(req: any, signature: string) {
    this.logger.log(`Relaying transaction for ${req.from}`);

    try {
      const wallet = this.blockchainService.getWallet();
      const forwarderAddress = process.env.FORWARDER_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';

      const forwarder = new ethers.Contract(forwarderAddress, FORWARDER_ABI, wallet);

      const tx = await forwarder.execute(req, signature);
      const receipt = await tx.wait();

      return { txHash: receipt.hash };
    } catch (error: any) {
      this.logger.error(`Failed to relay transaction: ${error.message}`);
      throw new HttpException('Failed to relay transaction, falling back to direct tx', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
