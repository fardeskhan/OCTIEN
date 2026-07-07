/**
 * PlatformSDK
 * The ONLY interface injected into Marketplace Plugins.
 * Plugins are fundamentally barred from accessing Repositories, Databases, or the EventBus directly.
 */
export interface PlatformSDK {
  commands: {
    execute(domain: string, command: string, payload: any): Promise<void>;
  };
  queries: {
    execute(domain: string, query: string, payload: any): Promise<any>;
  };
  workflow: {
    start(processId: string, context: any): Promise<void>;
  };
  documents: {
    generate(templateId: string, data: any): Promise<string>;
  };
  notifications: {
    send(userId: string, message: string): Promise<void>;
  };
  search: {
    query(index: string, terms: string): Promise<any>;
  };
  aiTools: {
    invoke(toolName: string, args: any): Promise<any>;
  };
  configuration: {
    get(key: string): Promise<string>;
  };
}
