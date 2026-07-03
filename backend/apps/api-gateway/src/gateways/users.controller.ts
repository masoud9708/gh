import { Controller, Get, Param, Post, Body, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';

@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':wallet/reputation')
  async getReputation(@Param('wallet') wallet: string) {
    const user = await this.prisma.user.findUnique({
      where: { walletAddress: wallet.toLowerCase() }
    });

    if (!user) {
        throw new NotFoundException('User not found');
    }

    return {
      walletAddress: user.walletAddress,
      reputationScore: user.reputationScore,
      driverLevel: user.driverLevel,
      reputationLevel: user.reputationLevel
    };
  }

  @Post('roles')
  async updateRoles(@Body() body: { walletAddress: string, roles: string[] }) {
    const user = await this.prisma.user.update({
      where: { walletAddress: body.walletAddress.toLowerCase() },
      data: {
        roles: body.roles
      }
    });
    return { success: true, roles: user.roles };
  }
}
