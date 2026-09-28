import { test } from "vitest";

export const Scenario = test;

const step = (_description: string, fn: () => Promise<void> | void) => fn();

export const Given = step;
export const When = step;
export const Then = step;
export const And = step;
