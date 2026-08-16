import type { RouterConfig } from "@nuxt/schema";

export default {
  scrollBehavior: (from, to, savedPosition) => {
    if (to.hash) {
      // 1. Skip hashes containing '=' so they aren't parsed as element IDs
      if (to.hash.includes("=")) {
        return false;
      }

      // 2. Safely query the selector for standard anchor hashes
      try {
        const escapedHash = `#${CSS.escape(to.hash.slice(1))}`;
        if (document.querySelector(escapedHash)) {
          return { el: escapedHash, behavior: "smooth" };
        }
      }
      // eslint-disable-next-line unused-imports/no-unused-vars
      catch (e) {
        return false;
      }
    }

    return savedPosition || { top: 0 };
  },
} satisfies RouterConfig;
