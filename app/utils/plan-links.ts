export function createPlanLink(planId: string, key: string, pathname = `/plans/${planId}`) {
  const link = new URL(pathname, import.meta.client ? globalThis.location.origin : "http://localhost");
  link.hash = `key=${key}`;
  return import.meta.client ? link.toString() : `${link.pathname}${link.hash}`;
}
