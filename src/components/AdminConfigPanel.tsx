"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export const PRESET_METRICS = [
  {
    name: 'CTA Click Rate + Scroll Depth',
    weights: { cta_click_rate: 1.0, scroll_depth_rate: 0.5, time_on_page: 0.2, bounce_rate: -0.2 },
    goal: "Optimize for maximum click-through rate on the primary CTA and encourage users to scroll through the entire page."
  },
  {
    name: 'Session Duration',
    weights: { cta_click_rate: 0.2, scroll_depth_rate: 0.2, time_on_page: 2.0, bounce_rate: -0.5 },
    goal: "Maximize the time users spend interacting with the application. Build engaging, sticky content or interactive tools that keep them hooked."
  }
];

export default function AdminConfigPanel({ initialConfig }: { initialConfig: any }) {
  const router = useRouter();
  
  // If activeMetricName is still the old 'default_score' from the DB, map it visually to the first preset.
  const resolvedMetricName = (initialConfig?.activeMetricName as any) === 'default_score' 
    ? PRESET_METRICS[0].name 
    : (initialConfig?.activeMetricName || PRESET_METRICS[0].name);

  const [config, setConfig] = useState({
    autoPromoteEnabled: initialConfig?.autoPromoteEnabled ?? false,
    personalEvolutionEnabled: initialConfig?.personalEvolutionEnabled ?? true,
    minVisitorsPerVariant: initialConfig?.minVisitorsPerVariant ?? 10,
    maxFreeGenerations: initialConfig?.maxFreeGenerations ?? 3,
    llmSystemPrompt: initialConfig?.llmSystemPrompt || "You are DarwinPage UX Researcher. Optimize for maximum user engagement and clarity.",
    optimizationGoal: initialConfig?.optimizationGoal || PRESET_METRICS[0].goal,
    activeMetricName: resolvedMetricName,
    scoreWeightsJson: initialConfig?.scoreWeightsJson || JSON.stringify(PRESET_METRICS[0].weights)
  });

  // Keep state in sync with server updates from router.refresh()
  useEffect(() => {
    if (initialConfig) {
      setConfig(prev => ({
        ...prev,
        autoPromoteEnabled: initialConfig.autoPromoteEnabled,
        personalEvolutionEnabled: initialConfig.personalEvolutionEnabled ?? true,
        minVisitorsPerVariant: initialConfig.minVisitorsPerVariant,
        maxFreeGenerations: initialConfig.maxFreeGenerations,
        llmSystemPrompt: initialConfig.llmSystemPrompt,
        optimizationGoal: initialConfig.optimizationGoal,
        activeMetricName: initialConfig.activeMetricName,
        scoreWeightsJson: initialConfig.scoreWeightsJson
      }));
    }
  }, [initialConfig]);
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
      router.refresh();
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
            <span className="font-semibold block text-white">Mutation für Admin (Unlimitiert)</span>
            <span className="text-sm text-neutral-500">Wenn aktiv, mutiert die Sandbox für dich als eingeloggter Admin unlimitiert (verbraucht API-Tokens).</span>
          </div>
        </label>

        <label className="flex items-center space-x-3 p-3 bg-black/50 border border-neutral-800 rounded-lg cursor-pointer hover:bg-neutral-900 transition">
          <input 
            type="checkbox" 
            checked={config.personalEvolutionEnabled} 
            onChange={e => setConfig({...config, personalEvolutionEnabled: e.target.checked})}
            className="w-5 h-5 text-cyan-500 bg-neutral-900 border-neutral-700 rounded focus:ring-cyan-500 focus:ring-offset-neutral-950"
          />
          <div>
            <span className="font-semibold block text-white">Mutation für Besucher (3 Free ➔ BYOK)</span>
            <span className="text-sm text-neutral-500">Besucher erhalten 3 freie Mutationen. Danach stoppt die Evolution für sie komplett, bis sie einen eigenen API-Key eintragen.</span>
          </div>
        </label>

        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-1">Minimum Interaction Events before Evolution</label>
          <input 
            type="number" 
            value={config.minVisitorsPerVariant} 
            onChange={e => setConfig({...config, minVisitorsPerVariant: parseInt(e.target.value) || 10})}
            className="w-full bg-black/50 border-neutral-800 text-white rounded-lg p-2 border focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-1">Free Generations per Visitor (BYOK Threshold)</label>
          <input 
            type="number" 
            value={config.maxFreeGenerations} 
            onChange={e => setConfig({...config, maxFreeGenerations: parseInt(e.target.value) || 3})}
            className="w-full bg-black/50 border-neutral-800 text-white rounded-lg p-2 border focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
          <p className="text-xs text-neutral-500 mt-1">Number of free mutations a visitor gets using the server API key before they must provide their own OpenAI key.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-1">Optimization Metric Profile</label>
          <select 
            value={config.activeMetricName}
            onChange={(e) => {
              const selected = PRESET_METRICS.find(m => m.name === e.target.value);
              if (selected) {
                setConfig({
                  ...config, 
                  activeMetricName: selected.name,
                  scoreWeightsJson: JSON.stringify(selected.weights),
                  optimizationGoal: selected.goal
                });
              }
            }}
            className="w-full bg-black/50 border-neutral-800 text-white rounded-lg p-2 border focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          >
            {PRESET_METRICS.map(m => (
              <option key={m.name} value={m.name}>{m.name}</option>
            ))}
          </select>
          <div className="mt-2 text-[10px] text-neutral-500 font-mono">
            Active Weights: {config.scoreWeightsJson}
          </div>
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
