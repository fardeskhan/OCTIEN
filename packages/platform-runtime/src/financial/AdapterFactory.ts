import { AdapterRegistry, IBankAdapter } from './AdapterRegistry';

export class AdapterFactory {
  constructor(private readonly registry: AdapterRegistry) {}

  /**
   * Constructs an adapter strictly using DI. 
   * Never instantiate adapters manually in code.
   */
  create(adapterId: string, tenantConfig: any): IBankAdapter {
    const adapter = this.registry.resolve(adapterId);
    // Apply tenant-specific configuration securely without exposing to domain
    return adapter;
  }
}
