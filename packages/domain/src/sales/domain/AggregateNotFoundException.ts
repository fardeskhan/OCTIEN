export class AggregateNotFoundException extends Error {
    constructor(public aggregateId: string, public aggregateType: string) {
        super(`Aggregate ${aggregateId} of type ${aggregateType} was not found.`);
        this.name = 'AggregateNotFoundException';
    }
}
