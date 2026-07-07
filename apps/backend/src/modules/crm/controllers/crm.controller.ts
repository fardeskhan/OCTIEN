import { Controller, Get } from '@nestjs/common';

@Controller('crm')
export class CrmController {
  @Get()
  getCrm() {
    return { status: 'ok', capability: 'crm' };
  }
}
