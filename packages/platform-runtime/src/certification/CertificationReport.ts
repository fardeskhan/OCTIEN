export interface CertificationCategoryScore {
  functional: number;
  security: number;
  performance: number;
  reliability: number;
  observability: number;
  compliance: number;
}

export interface CertificationReport {
  adapterId: string;
  version: string;
  runtimeVersion: string;
  certificationDate: Date;
  scores: CertificationCategoryScore;
  overallScore: number;
  status: 'Certified' | 'Sandbox' | 'Development' | 'Rejected';
  checksum: string;
}

export interface CertificationBadge {
  label: string;
  score: number;
  color: '🟢' | '🟡' | '🔴';
}
