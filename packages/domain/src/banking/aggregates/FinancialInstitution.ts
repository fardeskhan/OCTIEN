import { AggregateRoot } from '../../../shared-kernel/src/domain/AggregateRoot';

export enum InstitutionType {
  CommercialBank = 'COMMERCIAL_BANK',
  AccountAggregator = 'ACCOUNT_AGGREGATOR',
  PaymentGateway = 'PAYMENT_GATEWAY',
  CorporateBankingAPI = 'CORPORATE_BANKING_API',
  TreasuryPlatform = 'TREASURY_PLATFORM'
}

export class FinancialInstitution extends AggregateRoot<string> {
  private _name: string;
  private _type: InstitutionType;
  private _countryCode: string;
  private _capabilities: string[];
  private _status: string;

  private constructor(
    id: string,
    name: string,
    type: InstitutionType,
    countryCode: string,
    capabilities: string[]
  ) {
    super(id);
    this._name = name;
    this._type = type;
    this._countryCode = countryCode;
    this._capabilities = capabilities;
    this._status = 'ACTIVE';
  }

  public static register(
    id: string,
    name: string,
    type: InstitutionType,
    countryCode: string,
    capabilities: string[]
  ): FinancialInstitution {
    return new FinancialInstitution(id, name, type, countryCode, capabilities);
  }

  get name(): string { return this._name; }
  get type(): InstitutionType { return this._type; }
  get countryCode(): string { return this._countryCode; }
  get capabilities(): ReadonlyArray<string> { return this._capabilities; }
  get status(): string { return this._status; }
}
