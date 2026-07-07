export class ConcurrencyException extends Error {
    constructor(public aggregateId: string, public expectedVersion: number, public actualVersion: number) {
        super(`Concurrency conflict for aggregate ${aggregateId}. Expected version ${expectedVersion} but got ${actualVersion}.`);
        this.name = 'ConcurrencyException';
    }
}
