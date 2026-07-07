// @ts-nocheck
import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface TransferStockPayload {
  businessId: string;
  productId: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  batchId: string;
  quantity: number;
}

export function useTransferStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TransferStockPayload) => {
      return new Promise(resolve => setTimeout(resolve, 800));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'product', variables.businessId, variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'products', variables.businessId] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'dashboard', variables.businessId] });
    }
  });
}
