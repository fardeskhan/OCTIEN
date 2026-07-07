// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '../api/orders';
import { salesKeys } from '../api/keys';
import { queryDefaults } from '../../../shared/config/queryDefaults';

export function useOrders(limit?: number, offset?: number) {
  return useQuery({
    queryKey: salesKeys.orders(),
    queryFn: () => ordersApi.getOrders(limit, offset),
    staleTime: queryDefaults.orders.staleTime,
    gcTime: queryDefaults.orders.gcTime,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: salesKeys.order(id),
    queryFn: () => ordersApi.getOrderDetails(id),
    staleTime: queryDefaults.orders.staleTime,
    gcTime: queryDefaults.orders.gcTime,
    enabled: !!id,
  });
}
