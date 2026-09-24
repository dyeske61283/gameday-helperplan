export type StoredPlan = {
  blob: string;
  modifiedAt: number;
  meta: object;
  chunkCount?: number;
};

export const STORAGE_PREFIX = "plans" as const;
