import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { GatewayController } from './gateways/gateway.controller';
import { UsersController } from './gateways/users.controller';
import { RetailController } from './gateways/retail.controller';
import { FreightController } from './gateways/freight.controller';
import { BlockchainService } from './services/blockchain.service';
import { RelayerService } from './services/relayer.service';
import { DataService } from './services/data.service';
import { PrismaService } from './services/prisma.service';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'ghachagh-dev-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [
    GatewayController,
    UsersController,
    RetailController,
    FreightController,
  ],
  providers: [BlockchainService, RelayerService, DataService, PrismaService],
})
export class AppModule {}
