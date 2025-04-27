

export type Helper = {
  id: number;
  name: string;
  skills: Array<string>;
};

export type HelperInput = {
  name: string;
  skillsInput: string;
}

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

};

export type EncryptedPlanForStorage = {
  isEncrypted: true;
  encryptedBlob: string;
};

export type UnencryptedPlanForStorage = {
  isEncrypted: false;
  unencryptedBlob: {
    events: Event[];
    availableHelpers: Helper[];
    neededSkills: string[];
  }
};


export type PlanForStorage = {
  id: string;
  metaData: PlanMetaData;
} & (EncryptedPlanForStorage | UnencryptedPlanForStorage);

export type PlanMetaData = {
  createdAt?: Date;
  updatedAt?: Date;
  active?: boolean;
  name?: string;
  description?: string;
};