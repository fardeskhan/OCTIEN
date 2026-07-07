export interface IDistributedCheckpointStore {
  /**
   * Persists a cursor/checkpoint for a long-running sync or projection rebuild.
   */
  saveCheckpoint(streamId: string, lastEventId: string, lastOffset: number, token?: string): Promise<void>;

  /**
   * Retrieves the last successfully processed checkpoint.
   */
  getCheckpoint(streamId: string): Promise<{
    lastEventId: string;
    lastOffset: number;
    token?: string;
  } | null>;

  /**
   * Resets the checkpoint entirely, forcing a replay from the absolute beginning.
   */
  resetCheckpoint(streamId: string): Promise<void>;
}
