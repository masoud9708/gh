import { Module } from '@nestjs/common';
import { GatewayController } from './gateways/gateway.controller';
import { UsersController } from './gateways/users.controller';
import { RetailController } from './gateways/retail.controller';
import { FreightController } from './gateways/freight.controller';
import { BlockchainService } from './services/blockchain.service';
import { RelayerService } from './services/relayer.service';

@Module({
  imports: [],
  controllers: [
    GatewayController,
    UsersController,
    RetailController,
    FreightController,
  ],
  providers: [BlockchainService, RelayerService],
})
export class AppModule {}
