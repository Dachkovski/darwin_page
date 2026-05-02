"use client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartDataPoint } from './AnalyticsDashboard';

export default function EvolutionChart({ chartData, activeMetric, activeColor }: { chartData: ChartDataPoint[], activeMetric: string, activeColor: string }) {
  if (!chartData || chartData.length === 0) return <div className="text-neutral-600 flex justify-center items-center h-full">No data.</div>;
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={activeColor} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={activeColor} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
        <XAxis 
          dataKey="generation" 
          stroke="#666" 
          tick={{fill: '#888', fontSize: 12}} 
          tickFormatter={(val) => `Gen ${val}`}
          axisLine={false}
          tickLine={false}
        />
        <YAxis 
          stroke="#666" 
          tick={{fill: '#888', fontSize: 12}}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip 
          contentStyle={{ backgroundColor: '#171717', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
          itemStyle={{ color: activeColor, fontWeight: 'bold' }}
          labelStyle={{ color: '#888', marginBottom: '4px' }}
          formatter={(value: any) => {
            const safeVal = Number(value) || 0;
            if (['score', 'visitors'].includes(activeMetric)) return [safeVal.toFixed(2), ''];
            return [`${safeVal.toFixed(2)}%`, ''];
          }}
          labelFormatter={(label) => `Generation ${label}`}
        />
        <Area 
          type="monotone" 
          dataKey={activeMetric} 
          stroke={activeColor} 
          strokeWidth={3}
          fillOpacity={1} 
          fill="url(#colorMetric)" 
          activeDot={{ r: 6, strokeWidth: 0, fill: activeColor }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
