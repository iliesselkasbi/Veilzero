"use client";

import { burnTabHard, wipeOfflineData } from "@/lib/burn";

export default function BurnButton() {
  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (confirm("BURN TAB?\n\nStops sensitive session data in memory and returns home.")) {
            void burnTabHard()
              .then(() => {
                window.location.replace("/");
              })
              .catch(() => {
                alert("The tab was not fully cleared. The app will still return home.");
                window.location.replace("/");
              });
          }
        }}
        className="font-mono text-[11px] tracking-wide text-[#ff003c] border border-[#ff003c]/50 px-2 py-1 rounded hover:bg-[#ff003c]/10"
        title="Wipe in-tab session artifacts"
      >
        BURN
      </button>
      <button
        type="button"
        onClick={() => {
          if (confirm("WIPE OFFLINE DATA?\n\nThis removes VEILZERO's offline cache and service worker. Offline use will stop until you reconnect.")) {
            void wipeOfflineData()
              .then(() => alert("Offline data removed."))
              .catch(() => alert("Offline data could not be fully removed."));
          }
        }}
        className="font-mono text-[11px] tracking-wide text-text-muted border border-border px-2 py-1 rounded hover:text-danger"
        title="Remove offline cache and unregister the service worker"
      >
        WIPE OFFLINE DATA
      </button>
    </>
  );
}