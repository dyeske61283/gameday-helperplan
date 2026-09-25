export type StoredPlan = {
  blob: string;
  modifiedAt: number;
  meta: object;
  chunkCount?: number;
  revision?: number;
};

export const STORAGE_PREFIX = "plans" as const;
export const PLAN_BLOB_CHUNK_SIZE = 48 * 1024;
