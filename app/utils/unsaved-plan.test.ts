import { describe, expect, it, vi } from "vitest";
import { resolveUnsavedPlanChoice } from "./unsaved-plan";

describe("resolveUnsavedPlanChoice", () => {
  it("saves before allowing navigation", async () => {
    const save = vi.fn(async () => true);
    const discard = vi.fn();

    await expect(resolveUnsavedPlanChoice("save", save, discard)).resolves.toBe(true);
    expect(save).toHaveBeenCalledOnce();
    expect(discard).not.toHaveBeenCalled();
  });

  it("discards only after an explicit discard choice", async () => {
    const save = vi.fn(async () => true);
    const discard = vi.fn();

    await expect(resolveUnsavedPlanChoice("discard", save, discard)).resolves.toBe(true);
    expect(discard).toHaveBeenCalledOnce();
    expect(save).not.toHaveBeenCalled();
  });

  it("stays when the user cancels or a requested save fails", async () => {
    const discard = vi.fn();

    await expect(resolveUnsavedPlanChoice("stay", vi.fn(async () => true), discard)).resolves.toBe(false);
    await expect(resolveUnsavedPlanChoice("save", vi.fn(async () => false), discard)).resolves.toBe(false);
    expect(discard).not.toHaveBeenCalled();
  });
});
