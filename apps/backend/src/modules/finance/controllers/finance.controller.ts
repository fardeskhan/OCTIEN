import { Controller, Get } from '@nestjs/common';

@Controller('finance')
export class FinanceController {
  @Get()
  getFinance() {
    return { status: 'ok', capability: 'finance' };
  }
}
