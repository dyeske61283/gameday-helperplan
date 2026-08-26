export type StoredPlan = {
  blob: string;
  modifiedAt: number;
  meta: object;
};

export const STORAGE_PREFIX = "plans" as const;
