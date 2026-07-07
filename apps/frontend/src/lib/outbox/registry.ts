export type EventHandler = (event: any, tx?: any) => Promise<void>;

const registry: Record<string, EventHandler> = {};

export function registerHandler(eventType: string, handler: EventHandler) {
  registry[eventType] = handler;
}

export function getHandler(eventType: string): EventHandler | undefined {
  return registry[eventType];
}
