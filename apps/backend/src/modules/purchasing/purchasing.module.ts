import { Module } from '@nestjs/common';
import { PurchasingController } from './controllers/purchasing.controller';

@Module({
  controllers: [PurchasingController],
})
export class PurchasingModule {}
