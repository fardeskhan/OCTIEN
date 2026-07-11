import { useQuery } from '@tanstack/react-query';

export function useInventoryBatch(businessId: string, batchId: string) {
  return useQuery({
    queryKey: ['inventory', 'batch', businessId, batchId],
    queryFn: async () => {
      return {
        id: batchId,
        batchNumber: 'BATCH-2026-06-01',
        productId: 'UCO-RAW-01',
        productName: 'Raw Used Cooking Oil',
        warehouse: 'Dubai Central',
        currentQuantity: 3000,
        initialQuantity: 5000,
        status: 'OPEN',
        receivedDate: '2026-06-01T10:00:00Z',
        expiryDate: '2027-06-01T10:00:00Z',
      };
    },
    staleTime: 60 * 1000,
  });
}
