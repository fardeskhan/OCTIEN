import { Controller, Post, Body, Req, UseGuards, UseFilters } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/JwtAuthGuard';
import { GlobalExceptionFilter } from '../../common/filters/GlobalExceptionFilter';
import { CommandBus } from 'application/src/shared/CommandBus';
import { ReceiveStockCommand } from 'application/src/inventory/commands/receive-stock/ReceiveStockCommand';
import { RequestContext } from 'application/src/shared/RequestContext';
import { randomUUID } from 'crypto';

class ReceiveStockDto {
  productId!: string;
  warehouseId!: string;
  quantity!: number;
  unitOfMeasure!: string;
  batchId?: string;
}

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseFilters(GlobalExceptionFilter)
@Controller('api/v1/inventory')
export class InventoryController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('receive')
  @ApiOperation({ summary: 'Receive new stock into a warehouse' })
  @ApiResponse({ status: 201, description: 'Stock successfully received' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async receiveStock(@Req() req: any, @Body() dto: ReceiveStockDto) {
    
    // Abstract the HTTP headers and JWT claims away from the Domain
    const context: RequestContext = {
      businessId: req.user.businessId,
      tenantId: req.user.tenantId,
      actorId: req.user.actorId,
      correlationId: req.headers['x-correlation-id'] || randomUUID(),
      requestId: randomUUID(),
      traceId: req.headers['x-trace-id'] || randomUUID(),
      locale: req.user.locale,
      timezone: req.user.timezone,
      permissions: req.user.permissions,
      featureFlags: {}
    };

    const command = new ReceiveStockCommand(
      context,
      '', // inventoryId resolved in handler
      dto.productId,
      dto.warehouseId,
      dto.quantity,
      dto.unitOfMeasure,
      dto.batchId,
      req.headers['idempotency-key']
    );

    const result = await this.commandBus.execute(command);

    if (!result.success) {
      throw new Error(result.errors.join(', '));
    }

    return {
      success: true,
      data: result.data,
      traceId: context.traceId,
      timestamp: new Date().toISOString()
    };
  }
}
