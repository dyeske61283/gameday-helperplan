export type Helper = {
  id: number;
  name: string;
  labels: Array<string>;
  description: string;
  helperLists: Array<string>;
  skills: Array<string>;
};

export type HelperInput = Omit<Helper, "id">;

export type HelperSlot = {
  name: string;
  neededSkills: string[];
}

export type Event = {
  id: number;
  timestamp: Date;
  name: string;
  location?: Location;
  takeHelpersFromThisHelperListId?: string;
  neededHelpers: Array<HelperSlot>;
  helpers: Array<Helper>;
};

export type Location = {
  name: string;
  address: string;
  description?: string;
  identifier?: string;
  mapsUrl?: string;
  bhvId?: string;
  bhvUrl?: string;
  isDefaultLocation?: boolean;
};

export type Plan = {
  events: Event[];
  availableHelpers: Helper[];
  helperLists: HelperList[];
  neededSkills: string[];
  locations: Location[]; 
  name?: string;
  description?: string;
  active?: boolean;
};

export interface HelperList {
  id: string;
  name: string;
  helpers: Helper[];
}

export type EncryptedPlanForStorage = {
  isEncrypted: true;
  encryptedBlob: string;
  nonce: string;
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
