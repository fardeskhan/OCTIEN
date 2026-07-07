/**
 * MarketplacePluginContract
 * Frozen architectural contract guaranteeing third-party plugins are treated
 * as first-class citizens alongside internal capabilities.
 */
export interface MarketplacePluginContract {
  metadata: {
    id: string;
    version: string;
    author: string;
    license: string;
  };
  
  // Runtime requirements
  compatibility: {
    platformVersion: string;
    contractsVersion: string;
  };
  
  // Structural Contributions
  configurationSchema?: Record<string, any>;
  permissions?: string[];
  routes?: { path: string; componentId: string }[];
  uiExtensions?: { targetWorkspace: string; tabId: string }[];
  
  // CQRS & Event Contributions
  commands?: string[];
  queries?: string[];
  events?: { publisher: string; consumers: string[] }[];
  projections?: { eventSource: string; builderId: string }[];
  
  // Abstract Platform Hooks
  services?: string[];
  aiTools?: { toolName: string; description: string }[];
  healthChecks?: { endpoint: string; checkType: 'Deep' | 'Shallow' }[];
  migrations?: string[]; // DB schema changes
}
