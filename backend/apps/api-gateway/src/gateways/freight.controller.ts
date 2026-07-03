import { Controller, Get, Post, Body, Param } from '@nestjs/common';

@Controller('api/v1/cargo')
export class FreightController {
  @Get()
  getCargos() {
    return [];
  }

  @Post()
  createCargo(@Body() body: any) {
    return { success: true, cargoId: 'mock-cargo-id' };
  }
}
