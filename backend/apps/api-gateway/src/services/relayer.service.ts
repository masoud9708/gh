import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { ethers } from 'ethers';

const FORWARDER_ABI = [
  "function getNonce(address from) public view returns (uint256)",
  "function execute(tuple(address from, address target, uint256 value, uint256 nonce, bytes data, uint256 deadline) req, bytes signature) public payable returns (bool, bytes)"
];

@Injectable()
export class RelayerService {
  private readonly logger = new Logger(RelayerService.name);

  constructor(private readonly blockchainService: BlockchainService) {}

  async getNonce(walletAddress: string): Promise<number> {
    const provider = this.blockchainService.getProvider();
    const forwarderAddress = process.env.FORWARDER_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
    const forwarder = new ethers.Contract(forwarderAddress, FORWARDER_ABI, provider);
    const nonce = await forwarder.getNonce(walletAddress);
    return Number(nonce);
  }

  async relayTransaction(req: any, signature: string) {
    this.logger.log(`Relaying transaction for ${req.from}`);

    // Safety check: Validate target address to prevent gas draining
    const allowedTargets = [
      (process.env.FREIGHT_ESCROW_ADDRESS || '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9').toLowerCase(),
      (process.env.RETAIL_ESCROW_ADDRESS || '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9').toLowerCase()
    ];

    if (!allowedTargets.includes(req.target.toLowerCase())) {
        throw new HttpException('Target address not allowed', HttpStatus.FORBIDDEN);
    }

    // For now, throw an error so the frontend fallback (direct transaction) is triggered.
    // In production, this would execute Forwarder.execute(req, sig).
    throw new HttpException('Relayer not fully implemented yet, triggering fallback', HttpStatus.NOT_IMPLEMENTED);
  }
}
