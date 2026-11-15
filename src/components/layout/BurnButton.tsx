"use client";

import { burnTabHard } from "@/lib/burn";

export default function BurnButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (confirm("BURN TAB?\n\nStops sensitive session data in memory and returns home.")) {
          void burnTabHard().finally(() => {
            window.location.href = "/";
          });
        }
      }}
      className="font-mono text-[11px] tracking-wide text-[#ff003c] border border-[#ff003c]/50 px-2 py-1 rounded hover:bg-[#ff003c]/10"
      title="Wipe in-tab session artifacts"
    >
      BURN
    </button>
  );
}