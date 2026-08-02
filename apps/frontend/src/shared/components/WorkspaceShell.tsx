import React from 'react';
import { ProjectionBanner } from './ProjectionBanner';

export interface TabConfig {
  id: string;
  title: string;
  component: React.ReactNode;
}

export interface WorkspaceShellProps<T> {
  entityId: string;
  entityType: string;
  status: string;
  title: string;
  summaryCards: React.ReactNode;
  tabs: TabConfig[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  commands: React.ReactNode;
  irisContext: unknown; // Explicit AI context
  projectionMetadata: {
    version: number;
    lagEvents: number;
    updatedAt: Date;
  };
}

/**
 * Universal Workspace Shell for all OCTIEN capabilities (Sales, CRM, Manufacturing).
 * Guarantees standard UI patterns and eliminates navigation fatigue.
 */
export function WorkspaceShell<T>({
  entityId,
  title,
  status,
  summaryCards,
  tabs,
  activeTab,
  onTabChange,
  commands,
  projectionMetadata
}: WorkspaceShellProps<T>) {
  return (
    <div className="workspace-container">
      {/* 1. Header & Status Banner */}
      <header className="workspace-header border-b border-surfaceSecondary pb-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-textPrimary">{title}</h1>
            <span className="text-sm text-textMuted">ID: {entityId} | Status: <span className="text-primary font-semibold">{status}</span></span>
          </div>
          
          {/* Global Command Bar */}
          <div className="workspace-commands flex gap-2">
            {commands}
          </div>
        </div>
      </header>

      {/* Projection Lag Monitor */}
      <ProjectionBanner {...projectionMetadata} />

      {/* 2. Summary Cards */}
      <section className="workspace-summary grid grid-cols-4 gap-4 mb-6">
        {summaryCards}
      </section>

      {/* 3. Tab Navigation */}
      <nav className="workspace-tabs border-b border-surfaceSecondary mb-4 flex gap-6" aria-label="Workspace Tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`pb-2 ${activeTab === tab.id ? 'border-b-2 border-primary text-primary font-semibold' : 'text-textSecondary hover:text-textPrimary'}`}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.title}
          </button>
        ))}
      </nav>

      {/* 4. Main Content Area */}
      <main className="workspace-content bg-surface p-6 rounded shadow-sm border border-surfaceSecondary">
        {tabs.find(t => t.id === activeTab)?.component}
      </main>
    </div>
  );
}
