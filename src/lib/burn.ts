/** Best-effort wipe of in-tab sensitive artifacts. */
export function burnObjectUrls(...urls: Array<string | null | undefined>) {
  for (const u of urls) {
    if (u) {
      try {
        URL.revokeObjectURL(u);
      } catch {}
    }
  }
}

export async function burnTabHard() {
  // Revoke any blob: URLs the page still knows via performance entries (best effort)
  try {
    const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    for (const e of entries) {
      if (e.name.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(e.name);
        } catch {}
      }
    }
  } catch {}

  // Clear session scratch
  try {
    sessionStorage.clear();
  } catch {}

  // Optional: clear BW caches if PWA exists later
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {}
}