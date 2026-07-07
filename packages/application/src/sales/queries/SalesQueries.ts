import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export class OrderListView {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly state: string,
    public readonly totalAmount: number,
    public readonly currency: string,
    public readonly lastUpdatedAt: Date
  ) {}
}

export class OrderDetailsView {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly state: string,
    public readonly totalAmount: number,
    public readonly currency: string,
    public readonly reservations: any[],
    public readonly shipments: any[],
    public readonly invoices: any[],
    public readonly history: any[]
  ) {}
}

@Injectable()
export class SalesQueryHandlers {
  constructor(private readonly prisma: PrismaClient) {}

  async getDashboard(tenantId: string): Promise<any> {
    const data = await this.prisma.salesDashboardProjection.findUnique({
      where: { projectionId: `dash_${tenantId}` }
    });
    return data || null;
  }

  async getOrderList(tenantId: string, limit: number = 50, offset: number = 0): Promise<OrderListView[]> {
    const data = await this.prisma.customerOrderProjection.findMany({
      where: { tenantId },
      orderBy: { lastEventTimestamp: 'desc' },
      take: limit,
      skip: offset
    });
    
    return data.map(d => new OrderListView(
      d.aggregateId, d.customerId, d.state, d.totalAmount, d.currency, d.lastEventTimestamp
    ));
  }

  async getOrderDetails(orderId: string, tenantId: string): Promise<OrderDetailsView | null> {
    const order = await this.prisma.customerOrderProjection.findUnique({
      where: { projectionId: `order_proj_${orderId}` }
    });
    
    if (!order || order.tenantId !== tenantId) return null;

    return new OrderDetailsView(
      order.aggregateId, order.customerId, order.state, 
      order.totalAmount, order.currency, [], [], [], []
    );
  }
}
