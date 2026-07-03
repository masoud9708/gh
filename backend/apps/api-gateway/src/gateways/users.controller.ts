import { Controller, Get, Param, Post, Body } from '@nestjs/common';

@Controller('api/v1/users')
export class UsersController {
  @Get(':wallet/reputation')
  getReputation(@Param('wallet') wallet: string) {
    return {
      walletAddress: wallet,
      reputationScore: 85,
      driverLevel: 2,
    };
  }

  @Post('roles')
  updateRoles(@Body() body: { roles: string[] }) {
    return { success: true, roles: body.roles };
  }
}
