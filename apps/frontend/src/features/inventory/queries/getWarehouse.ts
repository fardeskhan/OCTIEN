// @ts-nocheck
import { useQuery } from '@tanstack/react-query';

export function useInventoryWarehouse(businessId: string, warehouseId: string) {
  return useQuery({
    queryKey: ['inventory', 'warehouse', businessId, warehouseId],
    queryFn: async () => {
      return {
        id: warehouseId,
        name: 'Dubai Central Warehouse',
        type: 'DISTRIBUTION',
        metrics: {
           totalProducts: 45,
           currentInventory: 154000,
           utilizationPercentage: 78,
           inventoryValue: 450000.00
        }
      };
    },
    staleTime: 60 * 1000,
  });
}
