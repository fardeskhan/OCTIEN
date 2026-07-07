export enum RelationshipStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED'
}

export class IntercompanyRelationship {
  constructor(
    public readonly entityA: string,
    public readonly entityB: string,
    public readonly status: RelationshipStatus = RelationshipStatus.ACTIVE
  ) {}
}
