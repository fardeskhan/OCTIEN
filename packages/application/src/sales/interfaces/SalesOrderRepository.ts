import { SalesOrder } from '@cosmyerp/domain/src/sales/aggregates/SalesOrder';

export interface SalesOrderRepository {
    load(id: string): Promise<SalesOrder>;
    save(aggregate: SalesOrder, expectedVersion: number): Promise<void>;
}
