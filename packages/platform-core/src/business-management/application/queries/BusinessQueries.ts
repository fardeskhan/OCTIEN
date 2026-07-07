export interface GetBusinessProfileQuery {
  businessId: string;
}

export interface GetBusinessDirectoryQuery {
  isActiveOnly: boolean;
}

export interface GetWarehouseDirectoryQuery {
  businessId: string;
  isActiveOnly?: boolean;
}

export interface GetWarehouseTreeQuery {
  warehouseId: string; // Returns Locations -> Zones -> Bins
}

export interface GetBranchDirectoryQuery {
  businessId: string;
}

export interface GetFiscalCalendarQuery {
  businessId: string;
  year: number;
}

export interface GetFiscalPeriodsQuery {
  calendarId: string;
}

export interface GetBusinessSettingsQuery {
  businessId: string;
  domain: 'Inventory' | 'Finance' | 'CRM' | 'Sales';
}

export interface GetBrandingQuery {
  businessId: string;
}
