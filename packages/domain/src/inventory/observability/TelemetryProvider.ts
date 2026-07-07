export interface TelemetryContext {
  tenantId: string;
  correlationId: string;
  causationId: string;
  reservationId?: string;
  movementId?: string;
  layerId?: string;
  streamId?: string;
  aggregateId?: string;
}

export class TelemetryProvider {
  // OpenTelemetry integration stub
  public static log(level: 'INFO' | 'WARN' | 'ERROR', message: string, context: TelemetryContext, data?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
      data
    };
    // In production, this pipes to an OpenTelemetry collector or structured logging sink (e.g. ELK/Datadog)
    console.log(JSON.stringify(logEntry));
  }

  public static recordMetric(metricName: string, value: number, context: TelemetryContext): void {
    // Records against SLAs/SLOs
    // e.g. Reservation Duration, Projection Lag, Tenant Throughput
    // This feeds Prometheous/Grafana dashboards
  }

  public static trace<T>(spanName: string, context: TelemetryContext, operation: () => Promise<T>): Promise<T> {
    // OpenTelemetry span tracing
    const start = Date.now();
    try {
      const result = operation();
      return result;
    } finally {
      const duration = Date.now() - start;
      this.recordMetric(`${spanName}_duration_ms`, duration, context);
    }
  }
}
