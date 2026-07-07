export interface CreateBusinessCommand {
  name: string;
  defaultCurrency: string;
  timezone: string;
}

export interface UpdateBusinessCommand {
  businessId: string;
  name?: string;
  timezone?: string;
}

export interface ArchiveBusinessCommand {
  businessId: string;
  reason: string;
}

export interface CreateBranchCommand {
  businessId: string;
  name: string;
  addressId: string | null;
}

export interface UpdateBranchCommand {
  branchId: string;
  name?: string;
}

export interface CreateWarehouseCommand {
  businessId: string;
  name: string;
}

export interface ActivateWarehouseCommand {
  warehouseId: string;
}

export interface DeactivateWarehouseCommand {
  warehouseId: string;
}

export interface CreateLocationCommand {
  warehouseId: string;
  zone: string;
  bin: string;
  shelf: string;
}

export interface CreateFiscalYearCommand {
  businessId: string;
  year: number;
}

export interface OpenFiscalPeriodCommand {
  calendarId: string;
  periodId: string;
}

export interface CloseFiscalPeriodCommand {
  calendarId: string;
  periodId: string;
}

export interface UpdateBusinessSettingsCommand {
  businessId: string;
  settingsPayload: any;
}

export interface UpdateBrandingCommand {
  businessId: string;
  logoUrl?: string;
  themeColor?: string;
}

export interface UpdateMoneyConfigurationCommand {
  businessId: string;
  decimalPrecision: number;
  roundingMode: 'ROUND_HALF_EVEN' | 'ROUND_HALF_UP' | 'ROUND_DOWN';
  exchangeRatePolicy: 'DAILY' | 'REAL_TIME' | 'MANUAL';
}
