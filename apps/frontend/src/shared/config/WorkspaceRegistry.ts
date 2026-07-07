import React from 'react';
import { TabConfig } from '../../shared/components/WorkspaceShell';

/**
 * WorkspaceRegistry
 * Instead of hardcoding components, capabilities register their tabs dynamically.
 * This allows a CRM module to inject a "Customer Activity" tab into the Sales Order workspace
 * without Sales needing to know about CRM.
 */
export class WorkspaceRegistry {
  private workspaceTabs = new Map<string, TabConfig[]>();

  registerTab(workspaceId: string, tab: TabConfig): void {
    if (!this.workspaceTabs.has(workspaceId)) {
      this.workspaceTabs.set(workspaceId, []);
    }
    
    // Check for duplicates
    const tabs = this.workspaceTabs.get(workspaceId)!;
    if (tabs.find(t => t.id === tab.id)) {
      console.warn(`[WorkspaceRegistry] Tab ${tab.id} already registered for workspace ${workspaceId}`);
      return;
    }

    tabs.push(tab);
  }

  getTabsForWorkspace(workspaceId: string): TabConfig[] {
    return this.workspaceTabs.get(workspaceId) || [];
  }
}

// Global registry instance
export const workspaceRegistry = new WorkspaceRegistry();
