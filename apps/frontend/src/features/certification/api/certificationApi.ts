import { salesApiClient } from '../../sales/api/client'; // Reusing base client for mock

export interface CapabilityCertificationScore {
  capabilityId: string;
  name: string;
  score: number;
  status: 'Prototype' | 'Engineering Ready' | 'Release Candidate' | 'Reference Capability';
  gatesPassed: number;
  totalGates: number;
  failingTests: number;
  criticalSecurityFindings: number;
  aiGovernancePassed: boolean;
}

export const certificationApi = {
  getPlatformScores: async (): Promise<CapabilityCertificationScore[]> => {
    // In reality, this queries the Backend Certification Service Projection
    return [
      {
        capabilityId: 'inventory',
        name: 'Inventory',
        score: 96,
        status: 'Reference Capability',
        gatesPassed: 15,
        totalGates: 15,
        failingTests: 0,
        criticalSecurityFindings: 0,
        aiGovernancePassed: true
      },
      {
        capabilityId: 'finance',
        name: 'Finance',
        score: 93,
        status: 'Release Candidate',
        gatesPassed: 13,
        totalGates: 15,
        failingTests: 2,
        criticalSecurityFindings: 0,
        aiGovernancePassed: false
      },
      {
        capabilityId: 'crm',
        name: 'CRM',
        score: 81,
        status: 'Engineering Ready',
        gatesPassed: 11,
        totalGates: 15,
        failingTests: 12,
        criticalSecurityFindings: 1,
        aiGovernancePassed: false
      },
      {
        capabilityId: 'sales',
        name: 'Sales',
        score: 42,
        status: 'Prototype',
        gatesPassed: 4,
        totalGates: 15,
        failingTests: 40,
        criticalSecurityFindings: 0,
        aiGovernancePassed: false
      }
    ];
  }
};
