import { Module } from '@nestjs/common';
import { FinanceController } from './controllers/finance.controller';

@Module({
  controllers: [FinanceController],
})
export class FinanceModule {}
