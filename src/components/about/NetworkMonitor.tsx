"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";

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
      <h2 className="font-display text-xl font-bold tracking-wide">
        Prove the wire is quiet
      </h2>
      <p className="mt-2 text-sm text-text-muted">
        Best-effort observations of requests <em>this page</em> has made since load.
        Performance entries can miss activity; this is not proof that no network traffic
        occurred. Your recordings and scrubbed files are not listed here. For a second
        opinion, inspect DevTools → Network.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <Stat label="Requests" value={rows.length} />
        <Stat label="Off-origin" value={external.length} />
        <Stat label="Beacons" value={posts.length} />
      </div>
      <p className="mt-3 font-mono text-[10px] tracking-wider text-text-muted">
        TARGET: 0 OFF-ORIGIN · 0 BEACONS · MEDIA NEVER LISTED
      </p>
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