import { ReportDefinition } from '../aggregates/ReportDefinition';

export class ReportRegistry {
  private definitions: Map<string, ReportDefinition[]> = new Map();

  public register(definition: ReportDefinition): void {
    const existing = this.definitions.get(definition.type) || [];
    this.definitions.set(definition.type, [...existing, definition]);
  }

  public resolveLatest(type: string): ReportDefinition {
    const existing = this.definitions.get(type);
    if (!existing || existing.length === 0) {
      throw new Error(`No report definition found for type: ${type}`);
    }
    // Assume sorted by version ascending, return last
    return existing[existing.length - 1];
  }

  public resolveVersion(type: string, version: string): ReportDefinition {
    const existing = this.definitions.get(type);
    if (!existing) throw new Error(`No report definition found for type: ${type}`);
    
    const definition = existing.find(d => d.version === version);
    if (!definition) throw new Error(`Version ${version} not found for type: ${type}`);
    
    return definition;
  }
}
