let lastPageView = { path: "", time: 0 };

const PAGE_VIEW_DEBOUNCE_MS = 5000;

export function trackEvent(
  event_type: string,
  page_path?: string,
  metadata?: Record<string, unknown>,
) {
  try {
    // Debounce duplicate page views within 5 seconds
    if (event_type === "page_view" && page_path) {
      const now = Date.now();
      if (
        page_path === lastPageView.path &&
        now - lastPageView.time < PAGE_VIEW_DEBOUNCE_MS
      ) {
        return;
      }
      lastPageView = { path: page_path, time: now };
    }

    fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type, page_path, metadata }),
      keepalive: true,
    }).catch(() => {
      // fire-and-forget — never throw
    });
  } catch {
    // never throw
  }
}
