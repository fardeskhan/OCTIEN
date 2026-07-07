export class ConcurrencyConflictException extends Error {
  constructor(streamId: string, expectedVersion: number, actualVersion: number) {
    super(`Concurrency conflict in stream ${streamId}. Expected version ${expectedVersion} but found ${actualVersion}.`);
    this.name = 'ConcurrencyConflictException';
  }
}
