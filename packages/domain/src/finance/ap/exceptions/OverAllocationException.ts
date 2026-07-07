export class OverAllocationException extends Error {
  constructor(attempted: string, available: string) {
    super(`Cannot allocate ${attempted}. The maximum available amount is ${available}.`);
    this.name = 'OverAllocationException';
  }
}
