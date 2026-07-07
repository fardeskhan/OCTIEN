export interface WorkerManifest {
  workerId: string;
  intervalMs: number;
  concurrency: number;
  timeoutMs: number;
  retryPolicy: 'exponential' | 'linear' | 'fibonacci';
  checkpointStrategy: 'per-event' | 'per-batch';
  tenantAware: boolean;
}

export interface IBackgroundWorker {
  manifest(): WorkerManifest;
  execute(): Promise<void>;
  health(): Promise<{ isHealthy: boolean; queueDepth: number; deadLetterCount: number }>;
  gracefulShutdown(): Promise<void>;
}

export class WorkerRegistry {
  private workers: Map<string, IBackgroundWorker> = new Map();

  register(worker: IBackgroundWorker): void {
    const manifest = worker.manifest();
    this.workers.set(manifest.workerId, worker);
    // Initialize open-telemetry metrics specifically for this worker
  }

  get(workerId: string): IBackgroundWorker | undefined {
    return this.workers.get(workerId);
  }

  list(): IBackgroundWorker[] {
    return Array.from(this.workers.values());
  }

  async shutdownAll(): Promise<void> {
    const shutdownTasks = this.list().map(w => w.gracefulShutdown());
    await Promise.all(shutdownTasks);
  }
}
