export interface IWorkerCoordinator {
  /**
   * Registers a background worker with the coordination service.
   */
  registerWorker(workerId: string, workerType: string): Promise<void>;

  /**
   * Emits a periodic heartbeat to prevent the worker from being marked as dead.
   */
  heartbeat(workerId: string): Promise<void>;

  /**
   * Acquires a task off the worker-specific queue.
   */
  acquireTask<T>(workerType: string, workerId: string): Promise<{ taskId: string, payload: T } | null>;

  /**
   * Marks a task as successfully completed.
   */
  completeTask(taskId: string, workerId: string): Promise<void>;

  /**
   * Marks a task as failed, potentially routing it to a Dead Letter Queue.
   */
  failTask(taskId: string, workerId: string, errorReason: string): Promise<void>;

  /**
   * Pauses the worker globally (useful for maintenance or critical backpressure).
   */
  pause(workerType: string): Promise<void>;

  /**
   * Resumes the worker operation.
   */
  resume(workerType: string): Promise<void>;
}
