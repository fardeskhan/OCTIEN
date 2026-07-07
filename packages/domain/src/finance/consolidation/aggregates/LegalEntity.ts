export enum LegalEntityStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

export class LegalEntity {
  constructor(
    public readonly entityId: string,
    public readonly code: string,
    public readonly name: string,
    public readonly currency: string,
    public readonly status: LegalEntityStatus = LegalEntityStatus.ACTIVE
  ) {}
}
