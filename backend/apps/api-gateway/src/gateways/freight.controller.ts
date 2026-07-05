import { Controller, Get, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import { randomUUID } from 'crypto';

@Controller('api/v1/cargo')
export class FreightController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getCargos() {
    return this.prisma.contract.findMany({
      where: { contract_type: 'FREIGHT' },
      orderBy: { createdAt: 'desc' }
    });
  }

  @Get(':id')
  async getCargo(@Param('id') id: string) {
    const cargo = await this.prisma.contract.findUnique({ where: { id } });
    if (!cargo || cargo.contract_type !== 'FREIGHT') throw new NotFoundException('Cargo not found');
    return cargo;
  }

  @Post()
  async createCargo(@Body() body: any) {
    const cargoId = randomUUID();

    // In production, validate user auth context instead of trusting body
    const cargo = await this.prisma.contract.create({
      data: {
        id: cargoId,
        contract_type: 'FREIGHT',
        cargoId: body.cargoId || `CARGO-${Date.now()}`,
        shipperWallet: body.shipperWallet,
        cargoValue: body.cargoValue || 0,
        amountMatic: body.amountMatic || 0,
        pickupCode: body.pickupCode || '0000', // Mock generated code
        deliveryCode: body.deliveryCode || '9999', // Mock generated code
        state: 'CREATED'
      }
    });

    return { success: true, cargo };
  }
}
