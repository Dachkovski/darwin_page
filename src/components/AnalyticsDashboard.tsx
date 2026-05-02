"use client";

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, MousePointerClick, Users, TrendingUp, ChevronDown } from 'lucide-react';
import EvolutionChart from './EvolutionChart';

export type ChartDataPoint = {
  generation: number;
  variantId: string;
  visitors: number;
  ctaClicks: number;
  ctaClickRate: number; // percentage 0-100
  bounceRate: number; // percentage 0-100
  interactionRate: number; // percentage 0-100
  score: number;
};

export default function AnalyticsDashboard({ data }: { data: ChartDataPoint[] }) {
  const [activeMetric, setActiveMetric] = useState<keyof ChartDataPoint>('score');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sort data by generation ascending for the chart
  const chartData = [...data].sort((a, b) => a.generation - b.generation);

  const metrics = [
    { id: 'score', label: 'Overall Fitness Score', icon: <TrendingUp className="w-4 h-4" />, color: '#10b981' },
    { id: 'ctaClickRate', label: 'CTA Conversion Rate (%)', icon: <MousePointerClick className="w-4 h-4" />, color: '#3b82f6' },
    { id: 'interactionRate', label: 'Interaction Rate (Heatmap %)', icon: <Activity className="w-4 h-4" />, color: '#8b5cf6' },
    { id: 'bounceRate', label: 'Bounce Rate (%)', icon: <Users className="w-4 h-4" />, color: '#ef4444' },
    { id: 'visitors', label: 'Total Visitors', icon: <Users className="w-4 h-4" />, color: '#f59e0b' },
  ];

  const activeColor = metrics.find(m => m.id === activeMetric)?.color || '#10b981';

  // Calculate some top level KPI deltas (latest vs previous generation)
  const dataWithViews = chartData.filter(d => d.visitors > 0);
  const latestGen = dataWithViews.length > 0 ? dataWithViews[dataWithViews.length - 1] : null;
  const previousGen = dataWithViews.length > 1 ? dataWithViews[dataWithViews.length - 2] : null;

  const renderKpi = (label: string, value: string, oldVal: number | null, newVal: number | null, isHigherBetter = true) => {
    let deltaStr = null;
    let deltaColor = "text-neutral-500";
    if (oldVal !== null && newVal !== null && oldVal !== 0) {
      const delta = ((newVal - oldVal) / oldVal) * 100;
      const positive = delta > 0;
      const good = isHigherBetter ? positive : !positive;
      deltaColor = good ? "text-emerald-400" : "text-rose-400";
      deltaStr = `${positive ? '+' : ''}${delta.toFixed(1)}%`;
    }

    return (
      <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 flex flex-col">
        <span className="text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-1">{label}</span>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold text-white">{value}</span>
          {deltaStr && <span className={`text-xs font-medium mb-1 ${deltaColor}`}>{deltaStr}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 mb-8">
      {/* Top Level KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {renderKpi("Latest Score", latestGen?.score != null ? latestGen.score.toFixed(2) : "0", previousGen?.score || null, latestGen?.score || null)}
        {renderKpi("Latest CTA Rate", latestGen?.ctaClickRate != null ? `${latestGen.ctaClickRate.toFixed(1)}%` : "0%", previousGen?.ctaClickRate || null, latestGen?.ctaClickRate || null)}
        {renderKpi("Interaction Rate", latestGen?.interactionRate != null ? `${latestGen.interactionRate.toFixed(1)}%` : "0%", previousGen?.interactionRate || null, latestGen?.interactionRate || null)}
        {renderKpi("Bounce Rate", latestGen?.bounceRate != null ? `${latestGen.bounceRate.toFixed(1)}%` : "0%", previousGen?.bounceRate || null, latestGen?.bounceRate || null, false)}
      </div>

      {/* Main Chart Area */}
      <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Evolution Trajectory</h2>
            <p className="text-sm text-neutral-500">Visualize how the LLM optimizes parameters over generations.</p>
          </div>
          
          <div className="relative">
            <select 
              className="appearance-none bg-black/50 border border-neutral-700 text-white text-sm rounded-lg pl-4 pr-10 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              value={activeMetric}
              onChange={(e) => setActiveMetric(e.target.value as keyof ChartDataPoint)}
            >
              {metrics.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-neutral-400 pointer-events-none" />
          </div>
        </div>

        <div suppressHydrationWarning className="w-full h-[350px] min-h-[350px] min-w-0">
          {chartData.length > 0 ? (
            mounted ? (
              <EvolutionChart chartData={chartData} activeMetric={activeMetric} activeColor={activeColor} />
            ) : (
              <div className="w-full h-full animate-pulse bg-neutral-800/20 rounded-lg flex items-center justify-center text-neutral-600">
                Loading chart...
              </div>
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-600 border border-dashed border-neutral-800 rounded-lg">
              No evolution data available yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
