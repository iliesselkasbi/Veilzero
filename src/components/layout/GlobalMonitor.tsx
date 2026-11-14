"use client";
import { useEffect, useState } from "react";

export default function GlobalMonitor() {
  const [outbound, setOutbound] = useState(0);
  const [breach, setBreach] = useState(false);

  useEffect(() => {
    const checkNetwork = () => {
      const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const external = entries.filter((e) => e.name.startsWith("http") && !e.name.includes(location.host));
      setOutbound(external.length);
      if (external.length > 0) setBreach(true);
    };
    checkNetwork();
    const id = setInterval(checkNetwork, 1000);
    return () => clearInterval(id);
  }, []);

  const simulateBreach = () => {
    fetch("https://jsonplaceholder.typicode.com/todos/1").catch(()=>console.log("Pinged"));
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 font-mono text-[10px] tracking-wider flex flex-col items-end gap-2 pointer-events-none">
      <button onClick={simulateBreach} className="pointer-events-auto opacity-55 hover:opacity-100 text-danger transition-opacity">
        [ INJECT TEST PACKET ]
      </button>

      <div className={`flex items-center gap-2 px-3 py-1.5 rounded border backdrop-blur-sm transition-all duration-300 ${
        breach
          ? "bg-[#ff003c]/20 border-[#ff003c] text-[#ff003c] scale-110 shadow-[0_0_20px_rgba(255,0,60,0.5)]"
          : "bg-[#0a0a0a]/80 border-[#00FF41]/30 text-[#00FF41] shadow-[0_0_10px_rgba(0,255,65,0.1)]"
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${breach ? "bg-[#ff003c] animate-ping" : "bg-[#00FF41] animate-pulse"}`} />
        <span className="font-bold">{breach ? "CRITICAL: NETWORK BREACH DETECTED" : "ZERO-TRUST SECURE"}</span>
        <span className="opacity-50 ml-2">|</span>
        <span className="ml-2 font-bold">{outbound} EXT REQ</span>
      </div>
    </div>
  );
}