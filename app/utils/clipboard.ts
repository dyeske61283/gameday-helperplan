export async function copyToClipboard(value: string): Promise<boolean> {
  if (!import.meta.client || !navigator.clipboard)
    return false;

  try {
    await navigator.clipboard.writeText(value);
    return true;
  }
  catch {
    return false;
  }
}
