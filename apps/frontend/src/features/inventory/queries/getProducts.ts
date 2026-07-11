import { useQuery } from '@tanstack/react-query';

export interface ProductView {
  id: string;
  sku: string;
  name: string;
  category: string;
  availableQuantity: number;
  reservedQuantity: number;
  status: 'ACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export function useInventoryProducts(businessId: string) {
  return useQuery({
    queryKey: ['inventory', 'products', businessId],
    queryFn: async () => {
      // Mocking realistic product responses for UI rendering
      return [
        { id: '1', sku: 'UCO-RAW-01', name: 'Raw Used Cooking Oil', category: 'Raw Materials', availableQuantity: 5000, reservedQuantity: 1000, status: 'ACTIVE' },
        { id: '2', sku: 'SCA-330-CAN', name: 'Salam Cola 330ml Can', category: 'Finished Goods', availableQuantity: 12000, reservedQuantity: 0, status: 'ACTIVE' },
        { id: '3', sku: 'LUM-COF-01', name: 'Casa De Lumas Beans', category: 'Raw Materials', availableQuantity: 50, reservedQuantity: 20, status: 'LOW_STOCK' },
        { id: '4', sku: 'SCA-SYR-01', name: 'Cola Syrup Base', category: 'Raw Materials', availableQuantity: 0, reservedQuantity: 0, status: 'OUT_OF_STOCK' },
      ] as ProductView[];
    },
    staleTime: 60 * 1000,
  });
}
