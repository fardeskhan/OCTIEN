// @ts-nocheck
import { useQuery } from '@tanstack/react-query';

export function usePurchasingDashboard(businessId: string) {
  return useQuery({
    queryKey: ['purchasing', 'dashboard', businessId],
    queryFn: async () => {
      return { status: 'operational' };
    }
  });
}
