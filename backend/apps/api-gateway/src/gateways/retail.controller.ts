import { Controller, Get, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import { randomUUID } from 'crypto';

@Controller('api/v1/retail')
export class RetailController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('orders')
  async getOrders() {
    return this.prisma.contract.findMany({
      where: { contract_type: 'RETAIL' },
      orderBy: { createdAt: 'desc' }
    });
  }

  @Get('orders/:id')
  async getOrder(@Param('id') id: string) {
    const order = await this.prisma.contract.findUnique({ where: { id } });
    if (!order || order.contract_type !== 'RETAIL') throw new NotFoundException('Order not found');
    return order;
  }

  @Post('orders')
  async createOrder(@Body() body: any) {
    const orderId = randomUUID();

    // In production, validate user auth context
    const order = await this.prisma.contract.create({
      data: {
        id: orderId,
        contract_type: 'RETAIL',
        retailOrderId: body.retailOrderId || `ORDER-${Date.now()}`,
        buyerWallet: body.buyerWallet,
        sellerWallet: body.sellerWallet,
        amountMatic: body.amountMatic || 0,
        pickupCode: body.pickupCode || '0000',
        deliveryCode: body.deliveryCode || '9999',
        state: 'CREATED'
      }
    });

    return { success: true, order };
  }

  @Get('products')
  getProducts() {
    // This requires a Product model in prisma, returning mock for now to prevent build errors
    return [];
  }
}
