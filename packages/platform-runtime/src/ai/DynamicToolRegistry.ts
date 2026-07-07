import { CapabilityRegistry } from '../registries/CapabilityRegistry';

export class DynamicToolRegistry {
  constructor(private readonly capabilityRegistry: CapabilityRegistry) {}

  /**
   * Scrapes manifest.yaml across all active capabilities to dynamically 
   * assemble the AI Model Router context, eliminating hardcoded switch statements.
   */
  public async discoverTools(): Promise<any[]> {
    console.log('[DynamicToolRegistry] Traversing Capability Manifests...');
    
    const capabilities = await this.capabilityRegistry.listActive();
    const discoveredTools = [];

    for (const cap of capabilities) {
      const manifest = await this.capabilityRegistry.getManifest(cap.id);
      
      if (manifest.ai && manifest.ai.tools) {
        discoveredTools.push(...manifest.ai.tools);
      }
    }

    console.log(`[DynamicToolRegistry] Discovered ${discoveredTools.length} AI tools dynamically.`);
    return discoveredTools;
  }
}
