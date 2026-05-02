"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export function ActivityChart({ data }: { data: any[] }) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorInteractions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.5}/>
              <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
          <XAxis dataKey="name" stroke="#737373" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#737373" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#171717', borderColor: '#404040', borderRadius: '8px', color: '#e5e5e5' }}
            itemStyle={{ color: '#a855f7' }}
          />
          <Area type="monotone" dataKey="interactions" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorInteractions)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EngagementChart({ data }: { data: any[] }) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
          <XAxis dataKey="name" stroke="#737373" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#737373" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip 
            cursor={{ fill: '#262626' }}
            contentStyle={{ backgroundColor: '#171717', borderColor: '#404040', borderRadius: '8px', color: '#e5e5e5' }}
            itemStyle={{ color: '#22d3ee' }}
          />
          <Bar dataKey="seconds" fill="#22d3ee" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
