import React from 'react';
import { TabConfig } from '../../shared/components/WorkspaceShell';

export const salesWorkspaceTabs: TabConfig[] = [
  {
    id: 'summary',
    title: 'Summary',
    component: <div>Sales Summary Component</div>
  },
  {
    id: 'customer',
    title: 'Customer',
    component: <div>Customer Details Component</div>
  },
  {
    id: 'items',
    title: 'Order Items',
    component: <div>Order Items DataGrid</div>
  },
  {
    id: 'reservations',
    title: 'Reservations',
    component: <div>Inventory Reservations List</div>
  },
  {
    id: 'shipments',
    title: 'Shipments',
    component: <div>Shipment Tracking List</div>
  },
  {
    id: 'invoices',
    title: 'Invoices',
    component: <div>Invoice Ledger</div>
  },
  {
    id: 'documents',
    title: 'Documents',
    component: <div>Generated PDFs (AsyncDocumentViewer)</div>
  },
  {
    id: 'timeline',
    title: 'Timeline',
    component: <div>Activity History</div>
  },
  {
    id: 'audit',
    title: 'Audit',
    component: <div>Event Log</div>
  }
];
