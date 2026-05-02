"use client";

import { useState } from "react";

export default function AdminConfigPanel({ initialConfig }: { initialConfig: any }) {
  const [config, setConfig] = useState(initialConfig || {
    autoPromoteEnabled: false,
    minVisitorsPerVariant: 10,
    llmSystemPrompt: "You are DarwinPage UX Researcher. Optimize for maximum user engagement and clarity.",
    optimizationGoal: "Increase CTA clicks while reducing bounce rate and dead clicks."
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    try {
      await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert("Failed to save config.");
    }
    setLoading(false);
  };

  return (
    <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800 mb-8">
      <h2 className="text-xl font-bold mb-4 text-white">Autonomous Evolution Criteria</h2>
      
      <div className="space-y-4">
        <label className="flex items-center space-x-3 p-3 bg-black/50 border border-neutral-800 rounded-lg cursor-pointer hover:bg-neutral-900 transition">
          <input 
            type="checkbox" 
            checked={config.autoPromoteEnabled} 
            onChange={e => setConfig({...config, autoPromoteEnabled: e.target.checked})}
            className="w-5 h-5 text-emerald-500 bg-neutral-900 border-neutral-700 rounded focus:ring-emerald-500 focus:ring-offset-neutral-950"
          />
          <div>
            <span className="font-semibold block text-white">Enable Autonomous Loop</span>
            <span className="text-sm text-neutral-500">Automatically mutates the page when minimum visitors are reached.</span>
          </div>
        </label>

        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-1">Minimum Visitors before Evolution</label>
          <input 
            type="number" 
            value={config.minVisitorsPerVariant} 
            onChange={e => setConfig({...config, minVisitorsPerVariant: parseInt(e.target.value) || 10})}
            className="w-full bg-black/50 border-neutral-800 text-white rounded-lg p-2 border focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-1">LLM System Prompt (Persona)</label>
          <textarea 
            value={config.llmSystemPrompt} 
            onChange={e => setConfig({...config, llmSystemPrompt: e.target.value})}
            className="w-full bg-black/50 border-neutral-800 text-white rounded-lg p-2 border h-20 focus:border-emerald-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-1">Current Optimization Goal</label>
          <textarea 
            value={config.optimizationGoal} 
            onChange={e => setConfig({...config, optimizationGoal: e.target.value})}
            className="w-full bg-black/50 border-neutral-800 text-white rounded-lg p-2 border h-20 focus:border-emerald-500 outline-none"
            placeholder="e.g., Focus entirely on making the primary button irresistible."
          />
        </div>

        <button 
          onClick={handleSave} 
          disabled={loading}
          className="bg-emerald-600/20 text-emerald-400 border border-emerald-800 px-4 py-2 rounded-lg font-medium hover:bg-emerald-600/40 transition w-full mt-2"
        >
          {loading ? "Saving..." : saved ? "Saved!" : "Save Configuration"}
        </button>
      </div>
    </div>
  );
}
