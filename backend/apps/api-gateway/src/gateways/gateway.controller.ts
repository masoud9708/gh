import { Controller, Get, Post, Body, Param, UnauthorizedException, UseGuards, Request } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RelayerService } from '../services/relayer.service';
import { DataService } from '../services/data.service';
import { SiweMessage, generateNonce } from 'siwe';
import { AuthGuard } from '../services/auth.guard';

@Controller('api/v1')
export class GatewayController {
  constructor(
    private readonly relayerService: RelayerService,
    private readonly dataService: DataService,
    private readonly jwtService: JwtService
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
    const nonce = await this.relayerService.getNonce(wallet);
    return { nonce };
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

      // Generate real JWT token
      const payload = { sub: user.walletAddress, walletAddress: user.walletAddress, role: user.role };
      const token = await this.jwtService.signAsync(payload);

      return {
        token,
        user
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid signature');
    }
  }

  @UseGuards(AuthGuard)
  @Get('auth/profile')
  async getProfile(@Request() req: any) {
    const user = this.dataService.getUser(req.user.walletAddress);
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }
}
