"use client";
import { useEffect, useState } from "react";
import { installNetworkLockdown } from "@/lib/networkLockdown";

export default function GlobalMonitor() {
  const [outbound, setOutbound] = useState(0);
  const [blocked, setBlocked] = useState(0);
  const [breach, setBreach] = useState(false);

  useEffect(() => {
    installNetworkLockdown();
    const onBlocked = () => {
      setBlocked((count) => count + 1);
      setBreach(true);
    };
    const onPolicyViolation = (event: SecurityPolicyViolationEvent) => {
      try {
        if (new URL(event.blockedURI, location.href).origin !== location.origin) {
          onBlocked();
        }
      } catch {
        // Inline and other non-URL violations are not network requests.
      }
    };
    window.addEventListener("veilzero:blocked-request", onBlocked);
    document.addEventListener("securitypolicyviolation", onPolicyViolation);

    const checkNetwork = () => {
      const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const external = entries.filter((entry) => {
        try {
          return new URL(entry.name, location.href).origin !== location.origin;
        } catch {
          return false;
        }
      });
      setOutbound(external.length);
      if (external.length > 0) setBreach(true);
    };
    checkNetwork();
    const id = setInterval(checkNetwork, 1000);
    return () => {
      clearInterval(id);
      window.removeEventListener("veilzero:blocked-request", onBlocked);
      document.removeEventListener("securitypolicyviolation", onPolicyViolation);
    };
  }, []);

  const simulateBreach = () => {
    setBlocked((count) => count + 1);
    setBreach(true);
    window.setTimeout(() => setBreach(false), 1200);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 font-mono text-[10px] tracking-wider flex flex-col items-end gap-2 pointer-events-none">
      <button onClick={simulateBreach} className="pointer-events-auto opacity-55 hover:opacity-100 text-danger transition-opacity">
        [ SIMULATE BLOCKED REQUEST ]
      </button>

      <div className={`flex items-center gap-2 px-3 py-1.5 rounded border backdrop-blur-sm transition-all duration-300 ${
        breach
          ? "bg-[#ff003c]/20 border-[#ff003c] text-[#ff003c] scale-110 shadow-[0_0_20px_rgba(255,0,60,0.5)]"
          : "bg-[#0a0a0a]/80 border-[#00FF41]/30 text-[#00FF41] shadow-[0_0_10px_rgba(0,255,65,0.1)]"
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${breach ? "bg-[#ff003c] animate-ping" : "bg-[#00FF41] animate-pulse"}`} />
        <span className="font-bold">{breach ? "NETWORK SIGNAL / LOCAL TEST" : "NETWORK STATUS: NO EXTERNAL REQUESTS OBSERVED"}</span>
        <span className="opacity-50 ml-2">|</span>
        <span className="ml-2 font-bold">{outbound} EXT REQ</span>
        <span className="ml-2 font-bold">{blocked} BLOCKED</span>
      </div>
    </div>
  );
}