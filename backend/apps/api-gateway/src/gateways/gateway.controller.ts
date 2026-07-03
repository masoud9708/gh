import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { RelayerService } from '../services/relayer.service';

@Controller('api/v1')
export class GatewayController {
  constructor(private readonly relayerService: RelayerService) {}

  @Get('health')
  healthCheck() {
    return { status: 'ok', version: '3.0.0' };
  }

  // --- Meta-Transaction Relay Endpoints ---
  @Post('relay')
  async relay(@Body() body: { req: any; signature: string }) {
    return this.relayerService.relayTransaction(body.req, body.signature);
  }

  @Get('relay/nonce/:wallet')
  async getRelayNonce(@Param('wallet') wallet: string) {
    // Return a mock nonce (0) to simplify local development/testing of EIP-2771
    return { nonce: 0 };
  }

  // --- SIWE Auth Mock Endpoints ---
  @Post('auth/nonce')
  async getAuthNonce(@Body() body: { address: string }) {
    return { nonce: 'mock_nonce_1234567890', message: `Sign this message to login: mock_nonce_1234567890` };
  }

  @Post('auth/verify')
  async verifyAuth(@Body() body: { walletAddress: string, signature: string, message: string, role: string }) {
    // In production, verify the SIWE signature. For now, mock success.
    return {
      token: 'mock_jwt_token',
      user: {
        walletAddress: body.walletAddress,
        role: body.role,
        roles: [body.role],
        reputationScore: 50,
        reputationLevel: 'TRUSTED'
      }
    };
  }

  @Get('auth/profile')
  async getProfile() {
    return {
      walletAddress: '0xmockaddress',
      role: 'shipper',
      roles: ['shipper']
    };
  }
}
