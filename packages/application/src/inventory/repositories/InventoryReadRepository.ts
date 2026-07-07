import { InventoryDashboardView } from '../read-models/InventoryDashboardView';
import { MovementTimelineView } from '../read-models/MovementTimelineView';
import { PaginationInfo } from '../../shared/Query';

export interface InventoryReadRepository {
  getDashboardSummary(businessId: string): Promise<InventoryDashboardView>;
  
  getMovementTimeline(
    businessId: string, 
    inventoryId: string, 
    pagination?: PaginationInfo
  ): Promise<{ data: MovementTimelineView[], nextCursor?: string }>;
}
