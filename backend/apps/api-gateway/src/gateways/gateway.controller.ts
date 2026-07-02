import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { RelayerService } from '../services/relayer.service';

@Controller('api/v1')
export class GatewayController {
  constructor(private readonly relayerService: RelayerService) {}

  @Get('health')
  healthCheck() {
    return { status: 'ok', version: '3.0.0' };
  }

  @Post('relay')
  async relay(@Body() body: { req: any; signature: string }) {
    return this.relayerService.relayTransaction(body.req, body.signature);
  }

  @Get('relay/nonce/:wallet')
  async getNonce(@Param('wallet') wallet: string) {
    // Mock nonce
    return { nonce: 0 };
  }
}
