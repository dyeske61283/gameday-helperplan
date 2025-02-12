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
  timestamp?: Date | undefined;
  name: string;
  helpers: Array<Helper>;
};