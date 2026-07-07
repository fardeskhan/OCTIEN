import { DomainEvent } from '../DomainEvent';

export interface DeadLetterMessage {
  id: string;
  projectionName: string;
  event: DomainEvent<any>;
  globalPosition: number;
  errorReason: string;
  failedAt: string;
}

export interface ProjectionDLQ {
  sendToDeadLetter(projectionName: string, event: DomainEvent<any>, globalPosition: number, error: Error): Promise<void>;
}
