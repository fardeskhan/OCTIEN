export interface ProjectionHandler {
  (event: any, metadata: any): Promise<void>;
}

/**
 * ProjectionRegistry
 * Allows capabilities to dynamically register read model builders.
 * Eliminates massive hardcoded switch/case dispatcher blocks in favor of O(1) routing.
 */
export class ProjectionRegistry {
  // Map<EventName, Array<ProjectionHandler>>
  private handlers = new Map<string, ProjectionHandler[]>();

  register(eventName: string, handler: ProjectionHandler): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    this.handlers.get(eventName)!.push(handler);
  }

  async dispatch(event: any, metadata: any): Promise<void> {
    const eventName = event.constructor.name;
    const registeredHandlers = this.handlers.get(eventName) || [];
    
    // Execute all registered projection builders for this event concurrently
    await Promise.all(registeredHandlers.map(handler => handler(event, metadata)));
  }
}
