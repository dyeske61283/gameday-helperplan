type FeedScope = "matches" | "member-duties";

export function downloadICS(ics: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function useCalendarFeed() {
  const feedUrl = ref<string | null>(null);
  const failed = ref(false);

  async function create(planId: string, planKey: string, scope: FeedScope, memberId?: string) {
    feedUrl.value = null;
    failed.value = false;
    try {
      const result = await $fetch<{ feedUrl: string }>("/api/calendar-feeds", {
        method: "POST",
        body: { planId, planKey, scope, ...(memberId ? { memberId } : {}) },
      });
      feedUrl.value = new URL(result.feedUrl, window.location.origin).href;
    }
    catch {
      failed.value = true;
    }
  }

  const webcalUrl = computed(() => feedUrl.value?.replace(/^https?:/, "webcal:") ?? null);
  return { create, feedUrl, webcalUrl, failed };
}
