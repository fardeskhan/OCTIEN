export interface PlatformTelemetry {
  platform: {
    uptimeSeconds: number;
    buildVersion: string;
    gitCommit: string;
    deploymentRing: 'LOCAL' | 'DEV' | 'INT' | 'STG' | 'CANARY' | 'PROD';
    runtimeHealth: boolean;
  };
  commands: {
    throughputPerSecond: number;
    successRate: number;
    failureRate: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
  };
  queries: {
    throughputPerSecond: number;
    p95LatencyMs: number;
    cacheHitRatio: number;
  };
  events: {
    publishRatePerSecond: number;
    consumerLagMs: number;
    retryCount: number;
    dlqCount: number;
    replayRatePerSecond: number;
  };
  projections: {
    lagMs: number;
    rebuildDurationMs: number;
    replayProgressPercent: number;
  };
  infrastructure: {
    databaseActiveConnections: number;
    redisMemoryUsageBytes: number;
    queueDepth: number;
    workerUtilizationPercent: number;
  };
  identity: {
    loginSuccessRate: number;
    mfaFailureRate: number;
    authorizationDenials: number;
  };
  aiGateway: {
    totalRequests: number;
    approvalRate: number;
    executionTimeMs: number;
    blockedActions: number;
    tokenUsage: number;
  };
}
