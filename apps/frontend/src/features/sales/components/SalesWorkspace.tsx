// @ts-nocheck
import React, { useState } from 'react';
import { WorkspaceShell } from '../../../shared/components/WorkspaceShell';
import { salesWorkspaceTabs } from '../workspaceTabs';
import { ContextualIris } from '../../ai/components/ContextualIris';
import { useOrder } from '../queries/useOrders';
import { useConfirmOrder } from '../mutations/useConfirmOrder';

export const SalesWorkspace: React.FC<{ orderId: string }> = ({ orderId }) => {
  const [activeTab, setActiveTab] = useState('summary');
  
  // 1. Fetch from TanStack Query (cached per defaults)
  const { data: orderQueryData, isLoading } = useOrder(orderId);
  const order: any = orderQueryData;
  const { mutate: confirmOrder, isPending: isConfirming } = useConfirmOrder();

  if (isLoading) return <div>Loading Projection...</div>;
  if (!order) return <div>Order not found</div>;

  // 2. Build Strict AI Context
  const irisContext = {
    capability: 'Sales',
    entityType: 'CustomerOrder',
    entityId: order.orderId,
    permissions: ['Sales.Read', 'Sales.Manage'],
    currentProjectionVersion: 142, // Would derive from projection metadata
    availableCommands: ['ConfirmOrder', 'GenerateInvoice'],
    availableQueries: ['GetOrderDetails'],
    availableDocuments: [],
    workflowState: order.state
  };

  // 3. Command Bar
  const commands = (
    <>
      <button 
        className="px-4 py-2 bg-success text-white rounded font-semibold text-sm hover:opacity-90 disabled:opacity-50"
        onClick={() => confirmOrder(orderId)}
        disabled={isConfirming || order.state === 'Confirmed'}
      >
        {isConfirming ? 'Confirming...' : 'Confirm Order'}
      </button>
      <button className="px-4 py-2 bg-surfaceSecondary text-textPrimary border border-border rounded font-semibold text-sm hover:bg-surface">
        Cancel Order
      </button>
    </>
  );

  return (
    <div className="flex gap-4">
      {/* Main Workspace */}
      <div className="flex-1">
        <WorkspaceShell 
          entityId={order.orderId}
          entityType="CustomerOrder"
          title={`Order ${order.orderId}`}
          status={order.state}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={salesWorkspaceTabs}
          commands={commands}
          irisContext={irisContext}
          summaryCards={
            <>
              <div className="p-4 border border-border rounded bg-surface">
                <p className="text-xs text-textMuted uppercase">Total Amount</p>
                <p className="text-xl font-bold">{order.totalAmount} {order.currency}</p>
              </div>
              <div className="p-4 border border-border rounded bg-surface">
                <p className="text-xs text-textMuted uppercase">Customer</p>
                <p className="text-lg font-semibold">{order.customerId}</p>
              </div>
            </>
          }
          projectionMetadata={{
            version: 142,
            lagEvents: 0,
            updatedAt: order.lastUpdatedAt || new Date()
          }}
        />
      </div>

      {/* AI Assistant Sidebar */}
      <div className="w-80 flex-shrink-0">
        <ContextualIris context={irisContext} />
      </div>
    </div>
  );
};
