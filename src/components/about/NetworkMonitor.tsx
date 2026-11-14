"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";

/**
 * Counts resource requests this page has made since load, using the browser's
 * own Performance API. Lets people verify "0 KB sent" themselves, and points to
 * DevTools for an independent check.
 */
export default function NetworkMonitor() {
  const [rows, setRows] = useState<{ name: string; type: string; kb: number }[]>([]);

  useEffect(() => {
    const read = () =>
      setRows(
        (performance.getEntriesByType("resource") as PerformanceResourceTiming[]).map((e) => ({
          name: e.name.replace(location.origin, ""),
          type: e.initiatorType,
          kb: Math.round((e.transferSize || 0) / 102.4) / 10,
        }))
      );
    read();
    const id = setInterval(read, 2000);
    return () => clearInterval(id);
  }, []);

  const external = rows.filter((r) => r.name.startsWith("http"));
  const posts = rows.filter((r) => r.type === "beacon");

  return (
    <Card>
      <h2 className="font-display text-xl font-bold tracking-wide">Verify it yourself</h2>
      <p className="mt-2 text-sm text-text-muted">
        Live view of requests this page has made. Your media never appears here. For an independent check, open
        DevTools → Network while using VEILZERO.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <Stat label="Requests" value={rows.length} />
        <Stat label="Third-party" value={external.length} />
        <Stat label="Beacons sent" value={posts.length} />
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface-alt py-3">
      <div className="font-mono text-2xl text-primary">{value}</div>
      <div className="text-xs text-text-muted">{label}</div>
    </div>
  );
}
