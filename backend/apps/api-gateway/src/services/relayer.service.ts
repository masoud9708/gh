import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { ethers } from 'ethers';

@Injectable()
export class RelayerService {
  private readonly logger = new Logger(RelayerService.name);

  constructor(private readonly blockchainService: BlockchainService) {}

  async relayTransaction(req: any, signature: string) {
    this.logger.log(`Relaying transaction for ${req.from}`);

    // For now, throw an error so the frontend fallback (direct transaction) is triggered.
    // In production, this would execute Forwarder.execute(req, sig).
    throw new HttpException('Relayer not fully implemented yet, triggering fallback', HttpStatus.NOT_IMPLEMENTED);
  }
}
