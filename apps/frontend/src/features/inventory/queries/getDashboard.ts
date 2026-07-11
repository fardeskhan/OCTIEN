import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';

export interface DashboardSummary {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  warehouseCount: number;
  reservedQuantity: number;
}

export function useInventoryDashboard(businessId: string) {
  return useQuery({
    queryKey: ['inventory', 'dashboard', businessId],
    queryFn: async () => {
      // In a real environment, this resolves against the NestJS GetInventoryDashboardHandler
      // const res = await api.get(`/api/v1/inventory/dashboard?businessId=${businessId}`); 
      // return res.data.data;

      // Mocking the payload for immediate UI development
      return {
        totalProducts: 142,
        totalStockValue: 1245000.50,
        lowStockCount: 4,
        warehouseCount: 3,
        reservedQuantity: 1500
      } as DashboardSummary;
    },
    staleTime: 60 * 1000, // 1 Minute stale time
  });
}
