import { useQuery } from '@tanstack/react-query';

export interface ProductDetailView {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  status: 'ACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  totalAvailable: number;
  totalReserved: number;
  warehouses: { id: string; name: string; available: number; reserved: number }[];
  recentBatches: { id: string; batchNumber: string; quantity: number; expiry?: string; status: string }[];
  recentMovements: { id: string; type: string; quantity: number; date: string; warehouse: string }[];
}

export function useInventoryProduct(businessId: string, productId: string) {
  return useQuery({
    queryKey: ['inventory', 'product', businessId, productId],
    queryFn: async () => {
      // Return highly structured payload for the Workspace layout
      return {
        id: productId,
        sku: 'UCO-RAW-01',
        name: 'Raw Used Cooking Oil',
        category: 'Raw Materials',
        description: 'Unfiltered, untreated used cooking oil sourced from restaurants.',
        status: 'ACTIVE',
        totalAvailable: 5000,
        totalReserved: 1000,
        warehouses: [
          { id: 'w1', name: 'Dubai Central', available: 4000, reserved: 1000 },
          { id: 'w2', name: 'Abu Dhabi Annex', available: 1000, reserved: 0 },
        ],
        recentBatches: [
          { id: 'b1', batchNumber: 'BATCH-2026-06-01', quantity: 3000, status: 'OPEN' },
          { id: 'b2', batchNumber: 'BATCH-2026-06-15', quantity: 2000, status: 'OPEN' },
        ],
        recentMovements: [
          { id: 'm1', type: 'RECEIVED', quantity: 2000, date: '2026-06-15T10:00:00Z', warehouse: 'Dubai Central' },
          { id: 'm2', type: 'RESERVED', quantity: 1000, date: '2026-06-16T14:30:00Z', warehouse: 'Dubai Central' },
        ]
      } as ProductDetailView;
    },
    staleTime: 60 * 1000,
  });
}
