import { useQuery } from '@tanstack/react-query';

export interface TimelineEvent {
  id: string;
  type: string;
  quantity: number;
  sourceWarehouse?: string;
  destinationWarehouse?: string;
  batchNumber?: string;
  user: string;
  timestamp: string;
  reference: string;
  productSku: string;
  productName: string;
}

export function useInventoryTimeline(businessId: string) {
  return useQuery({
    queryKey: ['inventory', 'timeline', businessId],
    queryFn: async () => {
      // Mocking the deeply structured Ledger Events
      return [
        { id: '1', type: 'RECEIVED', quantity: 5000, destinationWarehouse: 'Dubai Central', batchNumber: 'BATCH-2026', user: 'Admin', timestamp: '2026-06-25T10:00:00Z', reference: 'PO-9921', productSku: 'UCO-RAW-01', productName: 'Raw Used Cooking Oil' },
        { id: '2', type: 'TRANSFERRED', quantity: 500, sourceWarehouse: 'Dubai Central', destinationWarehouse: 'Abu Dhabi Annex', batchNumber: 'BATCH-2026', user: 'System', timestamp: '2026-06-24T15:30:00Z', reference: 'TR-1002', productSku: 'UCO-RAW-01', productName: 'Raw Used Cooking Oil' },
        { id: '3', type: 'RESERVED', quantity: 1000, sourceWarehouse: 'Dubai Central', batchNumber: 'BATCH-2026', user: 'Sales Rep 1', timestamp: '2026-06-24T09:15:00Z', reference: 'ORD-5541', productSku: 'SCA-330-CAN', productName: 'Salam Cola 330ml Can' },
        { id: '4', type: 'ADJUSTED', quantity: -10, sourceWarehouse: 'Dubai Central', batchNumber: 'BATCH-2026', user: 'Audit Team', timestamp: '2026-06-23T11:00:00Z', reference: 'SHRINKAGE', productSku: 'LUM-COF-01', productName: 'Casa De Lumas Beans' }
      ] as TimelineEvent[];
    },
    staleTime: 60 * 1000,
  });
}
