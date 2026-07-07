export interface IBankAdapter {
  adapterId(): string;
  version(): string;
  capabilities(): any;
  status(): 'Certified' | 'Sandbox' | 'Deprecated' | 'Retired';
  health(): Promise<{ isHealthy: boolean; latencyMs: number }>;
}

export class AdapterRegistry {
  private adapters: Map<string, IBankAdapter> = new Map();

  register(adapter: IBankAdapter): void {
    if (adapter.status() === 'Retired') {
      throw new Error(`Cannot register retired adapter: ${adapter.adapterId()}`);
    }
    this.adapters.set(adapter.adapterId(), adapter);
  }

  unregister(id: string): void {
    this.adapters.delete(id);
  }

  resolve(adapterId: string): IBankAdapter {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) throw new Error(`Adapter ${adapterId} not found in registry.`);
    return adapter;
  }

  list(): IBankAdapter[] {
    return Array.from(this.adapters.values());
  }
}
