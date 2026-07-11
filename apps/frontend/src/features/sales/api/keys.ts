export const salesKeys = {
  all: ['sales'] as const,
  dashboards: () => [...salesKeys.all, 'dashboard'] as const,
  orders: () => [...salesKeys.all, 'orders'] as const,
  order: (id: string) => [...salesKeys.orders(), id] as const,
  orderReservations: (id: string) => [...salesKeys.order(id), 'reservations'] as const,
  orderShipments: (id: string) => [...salesKeys.order(id), 'shipments'] as const,
  orderInvoices: (id: string) => [...salesKeys.order(id), 'invoices'] as const,
  metadata: () => [...salesKeys.all, 'metadata'] as const,
};
