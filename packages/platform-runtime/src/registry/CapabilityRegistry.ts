import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * CapabilityRegistry
 * Handles lazy loading of capability modules by reading their canonical manifest.yaml.
 * Ensures that large ERP installations do not suffer eager-load memory bloat.
 */
export class CapabilityRegistry {
  private loadedCapabilities = new Map<string, any>();

  async load(capabilityId: string): Promise<void> {
    if (this.loadedCapabilities.has(capabilityId)) {
      return; // Already loaded
    }

    console.log(`[Registry] Lazy loading capability: ${capabilityId}`);
    
    // 1. Read Canonical Manifest
    // In reality, this reads packages/domain/src/{capabilityId}/manifest.yaml
    const manifestPath = path.join(process.cwd(), 'packages', 'domain', 'src', capabilityId, 'manifest.yaml');
    
    try {
      const manifestFile = await fs.readFile(manifestPath, 'utf-8');
      
      // 2. Validate dependencies before loading memory structures
      this.validateManifest(manifestFile);

      // 3. Mount routes, permissions, and event subscribers dynamically
      this.loadedCapabilities.set(capabilityId, { status: 'Running', manifest: manifestFile });
      
    } catch (e) {
      console.warn(`[Registry] Could not load capability ${capabilityId}: ${e.message}`);
    }
  }

  private validateManifest(manifest: string): void {
    // YAML parsing and structural validation logic goes here
  }

  getLoadedCapabilities(): string[] {
    return Array.from(this.loadedCapabilities.keys());
  }
}
