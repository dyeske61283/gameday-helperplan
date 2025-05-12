export type Helper = {
  id: number;
  name: string;
  labels: Array<string>;
  description: string;
  helperLists: Array<string>;
  skills: Array<string>;
};

export type HelperInput = Omit<Helper, "id">;

export type Event = {
  id: number;
  timestamp: Date;
  name: string;
  location?: string;
  helpers: Array<Helper>;
};

export type Plan = {
  events: Event[];
  availableHelpers: Helper[];
  helperLists: [];
  neededSkills: string[];
  name?: string;
  description?: string;
  active?: boolean;
};

export type EncryptedPlanForStorage = {
  isEncrypted: true;
  encryptedBlob: string;
};

export interface PlanForStorage extends EncryptedPlanForStorage {
  id: string;
  metaData: PlanMetaData;
}

export type PlanMetaData = {
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
};
