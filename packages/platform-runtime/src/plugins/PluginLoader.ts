export interface PlatformPlugin {
  id: string;
  version: string;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

/**
 * PluginLoader
 * Provides a formal extensibility point for Marketplace addons and 3rd-party integrations
 * without polluting the core Platform Runtime.
 */
export class PluginLoader {
  private activePlugins = new Map<string, PlatformPlugin>();

  async register(plugin: PlatformPlugin): Promise<void> {
    if (this.activePlugins.has(plugin.id)) {
      throw new Error(`[PluginLoader] Plugin ${plugin.id} is already registered.`);
    }
    
    this.activePlugins.set(plugin.id, plugin);
  }

  async loadActivePlugins(): Promise<void> {
    console.log('[BOOT] Initializing plugins...');
    for (const [id, plugin] of this.activePlugins) {
      console.log(`[BOOT] Starting plugin: ${id}@${plugin.version}`);
      await plugin.initialize();
    }
  }

  async shutdownAll(): Promise<void> {
    for (const plugin of this.activePlugins.values()) {
      await plugin.shutdown();
    }
  }
}
