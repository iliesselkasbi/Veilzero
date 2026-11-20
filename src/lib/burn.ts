/** Best-effort wipe of in-tab sensitive artifacts. */
const objectUrls = new Set<string>();

export function createTrackedObjectUrl(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  objectUrls.add(url);
  return url;
}

export function revokeTrackedObjectUrl(url: string): void {
  objectUrls.delete(url);
  URL.revokeObjectURL(url);
}

export function burnObjectUrls(...urls: Array<string | null | undefined>) {
  const targets = urls.length ? urls : [...objectUrls];
  for (const url of targets) {
    if (url) revokeTrackedObjectUrl(url);
  }
}

export async function burnTabHard() {
  burnObjectUrls();
  sessionStorage.clear();
}

export async function wipeOfflineData(): Promise<void> {
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("veilzero-")).map((key) => caches.delete(key)));
  }
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations
        .filter((registration) => new URL(registration.scope).origin === location.origin)
        .map((registration) => registration.unregister())
    );
  }
}
