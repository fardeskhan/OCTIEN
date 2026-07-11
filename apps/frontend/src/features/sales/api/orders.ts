import { salesApiClient } from './client';

export const ordersApi = {
  getOrders: async (limit: number = 50, offset: number = 0) => {
    return salesApiClient.get('/api/v1/sales/orders', { limit, offset });
  },
  getOrderDetails: async (id: string) => {
    return salesApiClient.get(`/api/v1/sales/orders/${id}`);
  },
  confirmOrder: async (id: string) => {
    return salesApiClient.post(`/api/v1/sales/orders/${id}/confirm`);
  },
  generateInvoice: async (id: string) => {
    return salesApiClient.post(`/api/v1/sales/orders/${id}/invoice`);
  }
};
