import { Controller, Get, Post, Body, Param } from '@nestjs/common';

@Controller('api/v1/retail')
export class RetailController {
  @Get('orders')
  getOrders() {
    return [];
  }

  @Post('orders')
  createOrder(@Body() body: any) {
    return { success: true, orderId: 'mock-order-id' };
  }

  @Get('products')
  getProducts() {
    return [];
  }
}
