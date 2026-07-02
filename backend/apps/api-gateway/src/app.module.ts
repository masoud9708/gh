import { Module } from '@nestjs/common';
import { GatewayController } from './gateways/gateway.controller';
import { BlockchainService } from './services/blockchain.service';
import { RelayerService } from './services/relayer.service';

@Module({
  imports: [],
  controllers: [GatewayController],
  providers: [BlockchainService, RelayerService],
})
export class AppModule {}
