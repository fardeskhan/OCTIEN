import { QueryHandler, QueryResult } from '../../../shared/Query';
import { GetInventoryDashboardQuery } from './GetInventoryDashboardQuery';
import { InventoryDashboardView } from '../../read-models/InventoryDashboardView';
import { InventoryReadRepository } from '../../repositories/InventoryReadRepository';

export class GetInventoryDashboardHandler implements QueryHandler<GetInventoryDashboardQuery, InventoryDashboardView> {
  constructor(private readonly readRepo: InventoryReadRepository) {}

  public async handle(query: GetInventoryDashboardQuery): Promise<QueryResult<InventoryDashboardView>> {
    try {
      // 1. Authorization happens via Query Pipeline Behaviors upstream
      
      // 2. Direct read from the denormalized store. No Domain Aggregates, No UoW!
      const dashboard = await this.readRepo.getDashboardSummary(query.context.businessId);

      return {
        success: true,
        data: dashboard,
        errors: []
      };
    } catch (error: any) {
      return {
        success: false,
        errors: [error.message]
      };
    }
  }
}
