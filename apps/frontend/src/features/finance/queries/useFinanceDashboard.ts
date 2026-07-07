// @ts-nocheck
import { useQuery } from '@tanstack/react-query';

export function useFinanceDashboard(businessId: string) {
  return useQuery({
    queryKey: ['finance', 'dashboard', businessId],
    queryFn: async () => {
      return { status: 'operational' };
    }
  });
}
