// @ts-nocheck
import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface AdjustStockPayload {
  businessId: string;
  productId: string;
  warehouseId: string;
  batchId: string;
  quantity: number;
  reason: string;
}

export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AdjustStockPayload) => {
      return new Promise(resolve => setTimeout(resolve, 800));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'product', variables.businessId, variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'products', variables.businessId] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'dashboard', variables.businessId] });
    }
  });
}
