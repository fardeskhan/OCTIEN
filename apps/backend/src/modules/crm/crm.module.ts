import { Module } from '@nestjs/common';
import { CrmController } from './controllers/crm.controller';

@Module({
  controllers: [CrmController],
})
export class CrmModule {}
