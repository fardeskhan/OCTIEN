export interface CertificationResult {
  certificationId: string;
  passed: boolean;
  message: string;
  durationMs: number;
  evidence: Record<string, unknown>;
  failureReason?: string;
}

export interface CertificationScenario {
  id: string; 
  name: string;
  execute(): Promise<CertificationResult>;
}

export interface CertificationReport {
  timestamp: Date;
  passedCount: number;
  failedCount: number;
  totalDurationMs: number;
  results: CertificationResult[];
  isEnterpriseReady: boolean;
}

export class CertificationSuite {
  private scenarios: CertificationScenario[] = [];

  public registerScenario(scenario: CertificationScenario): void {
    this.scenarios.push(scenario);
  }

  public async runAll(): Promise<CertificationReport> {
    const results: CertificationResult[] = [];
    let passedCount = 0;
    let failedCount = 0;
    let totalDurationMs = 0;

    for (const scenario of this.scenarios) {
      try {
        const start = Date.now();
        const result = await scenario.execute();
        const end = Date.now();
        
        // Safety fallback if duration isn't set by scenario
        if (!result.durationMs) result.durationMs = end - start;

        results.push(result);
        totalDurationMs += result.durationMs;

        if (result.passed) {
          passedCount++;
        } else {
          failedCount++;
        }
      } catch (error: any) {
        failedCount++;
        results.push({
          certificationId: scenario.id,
          passed: false,
          message: `Scenario threw unhandled exception`,
          durationMs: 0,
          evidence: { error: error.message, stack: error.stack },
          failureReason: 'UNHANDLED_EXCEPTION'
        });
      }
    }

    return {
      timestamp: new Date(),
      passedCount,
      failedCount,
      totalDurationMs,
      results,
      isEnterpriseReady: failedCount === 0 // 100% Success required
    };
  }
}
