"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminActions() {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  const runAction = async (action: string) => {
    setLoading(action);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error);
      
      // Refresh the page data to show new variants or logs
      router.refresh();
      
      console.log(`[${action} Output]\n${data.output}`);
      if (data.errorOutput) {
        console.warn(`[${action} Stderr]\n${data.errorOutput}`);
      }
      
      alert(`${action.toUpperCase()} completed successfully!\nSee browser console for full output logs.`);
    } catch (e: any) {
      alert(`Error running ${action}: ${e.message}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-4">
      <button 
        onClick={() => runAction('analyze')}
        disabled={loading !== null}
        className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm rounded border border-neutral-700 transition disabled:opacity-50 min-w-[120px]"
      >
        {loading === 'analyze' ? 'Running...' : 'Run Analyze'}
      </button>
      <button 
        onClick={() => runAction('evolve')}
        disabled={loading !== null}
        className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm rounded border border-neutral-700 transition disabled:opacity-50 min-w-[120px]"
      >
        {loading === 'evolve' ? 'Running...' : 'Run Evolve'}
      </button>
      <button 
        onClick={() => runAction('promote')}
        disabled={loading !== null}
        className="px-4 py-2 bg-emerald-900/50 hover:bg-emerald-800/80 text-emerald-400 text-sm rounded border border-emerald-800 transition disabled:opacity-50 min-w-[140px]"
      >
        {loading === 'promote' ? 'Running...' : 'Promote Winner'}
      </button>
    </div>
  );
}
