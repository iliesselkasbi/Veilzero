let installed = false;

function isExternal(url: string | URL): boolean {
  try {
    return new URL(url.toString(), window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
}

function reportBlocked(url: string | URL): void {
  window.dispatchEvent(
    new CustomEvent("veilzero:blocked-request", { detail: { url: url.toString() } })
  );
}

export function installNetworkLockdown(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const nativeFetch = window.fetch;
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input;
    if (isExternal(url)) {
      reportBlocked(url);
      throw new TypeError("Cross-origin requests are blocked by VEILZERO.");
    }
    return nativeFetch.call(window, input, init);
  }) as typeof window.fetch;

  const nativeOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async: boolean = true,
    username?: string | null,
    password?: string | null
  ): void {
    if (isExternal(url)) {
      reportBlocked(url);
      throw new DOMException("Cross-origin requests are blocked by VEILZERO.", "SecurityError");
    }
    nativeOpen.call(this, method, url, async, username ?? null, password ?? null);
  };

  if (typeof navigator.sendBeacon === "function") {
    const nativeSendBeacon = navigator.sendBeacon;
    navigator.sendBeacon = function (url: string | URL, data?: BodyInit | null): boolean {
      if (isExternal(url)) {
        reportBlocked(url);
        return false;
      }
      return nativeSendBeacon.call(this, url.toString(), data);
    };
  }
}
