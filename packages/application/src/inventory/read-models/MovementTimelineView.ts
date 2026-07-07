export interface MovementTimelineView {
  movementId: string;
  timestamp: Date;
  actor: string;
  type: string; // e.g., RECEIVED, RESERVED, TRANSFERRED
  quantity: number;
  unit: string;
  warehouse: string;
  batch?: string;
}
