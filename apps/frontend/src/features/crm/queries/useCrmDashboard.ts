import { useQuery } from '@tanstack/react-query';

export function useCrmDashboard(businessId: string) {
  return useQuery({
    queryKey: ['crm', 'dashboard', businessId],
    queryFn: async () => {
      return { status: 'operational' };
    }
  });
}
