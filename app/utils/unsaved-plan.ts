export type UnsavedPlanChoice = "save" | "discard" | "stay";

export async function resolveUnsavedPlanChoice(
  choice: UnsavedPlanChoice,
  save: () => Promise<boolean>,
  discard: () => void,
): Promise<boolean> {
  if (choice === "stay")
    return false;
  if (choice === "discard") {
    discard();
    return true;
  }
  return save();
}
