import { Controller, Get, Post, Body, Param, UnauthorizedException } from '@nestjs/common';
import { RelayerService } from '../services/relayer.service';
import { DataService } from '../services/data.service';
import { SiweMessage, generateNonce } from 'siwe';

@Controller('api/v1')
export class GatewayController {
  constructor(
    private readonly relayerService: RelayerService,
    private readonly dataService: DataService
  ) {}

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

  // --- SIWE Auth Endpoints ---
  @Post('auth/nonce')
  async getAuthNonce(@Body() body: { address: string }) {
    if (!body.address) {
      throw new UnauthorizedException('Address is required');
    }
    const nonce = generateNonce();
    this.dataService.setNonce(body.address, nonce);
    return { nonce };
  }

  @Post('auth/verify')
  async verifyAuth(@Body() body: { message: any, signature: string, role: string }) {
    try {
      const siweMessage = new SiweMessage(body.message);

      const expectedNonce = this.dataService.getNonce(siweMessage.address);
      if (!expectedNonce || expectedNonce !== siweMessage.nonce) {
         throw new UnauthorizedException('Invalid nonce');
      }

      // Verify signature
      const { data } = await siweMessage.verify({ signature: body.signature });

      // Invalidate nonce
      this.dataService.removeNonce(siweMessage.address);

      // Upsert user
      let user = this.dataService.getUser(data.address);
      if (!user) {
        user = this.dataService.createUser(data.address, body.role);
      } else if (!user.roles.includes(body.role)) {
        user.roles.push(body.role);
        user.role = body.role; // Set as active role
      }

      // Generate a mock JWT token for the architecture design
      const mockJwt = Buffer.from(JSON.stringify({ address: user.walletAddress, role: user.role })).toString('base64');

      return {
        token: mockJwt,
        user
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid signature');
    }
  }

  @Get('auth/profile/:wallet')
  async getProfile(@Param('wallet') wallet: string) {
    const user = this.dataService.getUser(wallet);
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }
}
