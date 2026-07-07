export enum DimensionType {
  LegalEntity = 'LegalEntity',
  BusinessUnit = 'BusinessUnit',
  Branch = 'Branch',
  Department = 'Department',
  CostCenter = 'CostCenter',
  ProfitCenter = 'ProfitCenter',
  Project = 'Project',
  Warehouse = 'Warehouse',
  Location = 'Location',
  Customer = 'Customer',
  Vendor = 'Vendor',
  Employee = 'Employee',
  Vehicle = 'Vehicle',
  Asset = 'Asset',
  Product = 'Product',
  Region = 'Region',
  Channel = 'Channel',
  Contract = 'Contract',
  Campaign = 'Campaign',
  Custom = 'Custom'
}

export interface AccountingDimension {
  id: string;
  type: DimensionType;
  code: string;
  name: string;
  value: string;
  version: string;
  path?: string;
  effectiveFrom?: string; // ISO-8601 UTC
  effectiveTo?: string;   // ISO-8601 UTC
}
