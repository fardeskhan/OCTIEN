import { Controller, Get } from '@nestjs/common';

@Controller('purchasing')
export class PurchasingController {
  @Get()
  getPurchasing() {
    return { status: 'ok', capability: 'purchasing' };
  }
}
