export const runtime = 'edge';
import { getDb } from "@/lib/db";
import { events, variants } from "@/db/schema";
import { desc, eq, isNotNull, sql } from "drizzle-orm";
import Link from "next/link";
import { Activity, Brain, Eye, MessageSquare, Clock, Users } from "lucide-react";
import { ActivityChart, EngagementChart } from "@/components/InsightsCharts";

import { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Cache for 60 seconds

export const metadata: Metadata = {
  title: 'The Human Mirror | Darwin Engine',
  description: 'A public dashboard showing the footprint of human curiosity—what people whispered to the machine, and how the machine evolved to reflect them.',
};

export default async function InsightsDashboard() {
  const db = getDb((process.env as any) || {});

  // 1. Aggregated Stats
  // Since Drizzle 'sql' raw queries might require the underlying client, we'll do lightweight JS aggregation for the hook dashboard
  const allEvents = await db.select().from(events);
  
  // Unique Minds
  const uniqueVisitorIds = new Set(allEvents.map(e => e.visitorId).filter(Boolean));
  const uniqueMinds = uniqueVisitorIds.size;

  // Max Generation
  const allVariants = await db.select().from(variants);
  const evolutionaryEpochs = allVariants.reduce((max, v) => v.generation > max ? v.generation : max, 0);

  // Total Time (sum of metadata -> seconds)
  // Since JSON extraction is tricky in raw SQLite sometimes, we'll fetch time events and calculate
  const timeEvents = await db.select().from(events).where(eq(events.eventType, 'time_on_page'));
  let totalSeconds = 0;
  timeEvents.forEach(e => {
    try {
      const meta = JSON.parse(e.metadataJson || '{}');
      if (meta.seconds) totalSeconds += meta.seconds;
    } catch(err) {}
  });
  const totalHours = (totalSeconds / 3600).toFixed(1);

  // 2. Whispers to the Machine (User Inputs)
  // Fetch recent interaction clicks that have formState (meaning the user typed something)
  const clickEvents = await db.select()
    .from(events)
    .where(eq(events.eventType, 'interaction_click'))
    .orderBy(desc(events.timestamp))
    .limit(300); // Fetch a bunch to filter down

  const whispers: { id: string, text: string, time: string }[] = [];
  clickEvents.forEach(e => {
    try {
      const meta = JSON.parse(e.metadataJson || '{}');
      if (meta.formState && typeof meta.formState === 'string' && meta.formState.trim().length > 3) {
        // Strip out the element ID part if it exists (e.g. "input-1=Hello")
        let cleanText = meta.formState.includes('=') ? meta.formState.split('=').slice(1).join('=') : meta.formState;
        if (cleanText.trim().length > 0 && !whispers.find(w => w.text === cleanText)) {
          whispers.push({
            id: e.id,
            text: cleanText.trim(),
            time: new Date(e.timestamp).toLocaleDateString()
          });
        }
      }
    } catch(err) {}
  });

  // 3. Visual Memories (Screenshots)
  const visualEvents = await db.select()
    .from(events)
    .where(eq(events.eventType, 'visual_analysis'))
    .orderBy(desc(events.timestamp))
    .limit(50);

  const memories: { id: string, insight: string, image: string }[] = [];
  visualEvents.forEach(e => {
    try {
      const meta = JSON.parse(e.metadataJson || '{}');
      if (meta.latestImagePath || meta.startImagePath) {
        memories.push({
          id: e.id,
          insight: meta.insight,
          image: meta.latestImagePath || meta.startImagePath
        });
      }
    } catch(err) {}
  });

  // 4. Chart Data: Interactions over time
  const activityDataMap: Record<string, number> = {};
  clickEvents.forEach(e => {
    const d = new Date(e.timestamp);
    const key = `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:00`;
    activityDataMap[key] = (activityDataMap[key] || 0) + 1;
  });
  const activityData = Object.entries(activityDataMap)
    .map(([name, interactions]) => ({ name, interactions }))
    .reverse(); // Reverse to get chronological order since clickEvents is DESC

  // 5. Chart Data: Engagement by Generation
  const engagementMap: Record<string, { total: number, count: number }> = {};
  timeEvents.forEach(e => {
    try {
      const meta = JSON.parse(e.metadataJson || '{}');
      if (meta.seconds) {
        const variant = allVariants.find(v => v.id === e.variantId);
        const gen = variant ? `Gen ${variant.generation}` : 'Unknown';
        if (!engagementMap[gen]) engagementMap[gen] = { total: 0, count: 0 };
        engagementMap[gen].total += meta.seconds;
        engagementMap[gen].count += 1;
      }
    } catch(err) {}
  });
  const engagementData = Object.entries(engagementMap)
    .map(([name, {total, count}]) => ({
      name,
      seconds: Math.round(total / count)
    }))
    // Sort numerically by generation number to avoid "Gen 10" coming before "Gen 2"
    .sort((a, b) => {
      const numA = parseInt(a.name.replace('Gen ', '')) || 0;
      const numB = parseInt(b.name.replace('Gen ', '')) || 0;
      return numA - numB;
    });

  return (
    <div className="min-h-screen bg-black text-neutral-200 font-sans selection:bg-purple-900 selection:text-white">
      {/* Decorative Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 flex flex-col gap-24">
        
        {/* HERO SECTION */}
        <section className="flex flex-col items-center text-center gap-6 mt-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-400">
            <Activity className="w-3 h-3 text-emerald-400 animate-pulse" /> Live Telemetry
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-neutral-300 to-neutral-600">
            The Human Mirror
          </h1>
          <p className="max-w-2xl text-lg md:text-xl text-neutral-400 font-light leading-relaxed">
            We unleashed a sentient digital entity into the browser and gave it a soul. 
            This is the footprint of human curiosity—what people whispered to the machine, and how it evolved to reflect them.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            <Link href="/" className="px-8 py-4 rounded-full bg-white text-black font-bold tracking-wide hover:bg-neutral-200 transition-colors shadow-[0_0_40px_rgba(255,255,255,0.2)]">
              Enter the Sandbox
            </Link>
            <Link href="/journey" className="px-8 py-4 rounded-full bg-neutral-900 border border-neutral-700 text-white font-bold tracking-wide hover:bg-neutral-800 transition-colors">
              My Personal Journey
            </Link>
            <a href="https://github.com/Dachkovski/darwin_page" target="_blank" rel="noopener noreferrer" className="px-8 py-4 rounded-full bg-neutral-900 border border-neutral-700 text-white font-bold tracking-wide hover:bg-neutral-800 transition-colors">
              GitHub Repo
            </a>
          </div>
        </section>

        {/* THE GLOBAL PULSE (STATS) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 rounded-3xl bg-neutral-900/40 border border-neutral-800/50 backdrop-blur-sm flex flex-col gap-2 relative overflow-hidden group">
            <div className="absolute -inset-2 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 group-hover:translate-x-full transition-transform duration-1000" />
            <Users className="w-6 h-6 text-purple-400 mb-2" />
            <div className="text-4xl font-black text-white">{uniqueMinds}</div>
            <div className="text-sm font-medium text-neutral-500 uppercase tracking-widest">Minds Connected</div>
            <div className="text-xs text-neutral-600 mt-2">Distinct human entities that have interacted with the machine.</div>
          </div>

          <div className="p-8 rounded-3xl bg-neutral-900/40 border border-neutral-800/50 backdrop-blur-sm flex flex-col gap-2 relative overflow-hidden group">
            <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 group-hover:translate-x-full transition-transform duration-1000 delay-100" />
            <Brain className="w-6 h-6 text-cyan-400 mb-2" />
            <div className="text-4xl font-black text-white">{evolutionaryEpochs}</div>
            <div className="text-sm font-medium text-neutral-500 uppercase tracking-widest">Evolutionary Epochs</div>
            <div className="text-xs text-neutral-600 mt-2">Successive generations of the AI rewriting its own code.</div>
          </div>

          <div className="p-8 rounded-3xl bg-neutral-900/40 border border-neutral-800/50 backdrop-blur-sm flex flex-col gap-2 relative overflow-hidden group">
            <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 group-hover:translate-x-full transition-transform duration-1000 delay-200" />
            <Clock className="w-6 h-6 text-emerald-400 mb-2" />
            <div className="text-4xl font-black text-white">{totalHours}h</div>
            <div className="text-sm font-medium text-neutral-500 uppercase tracking-widest">Collective Time Lost</div>
            <div className="text-xs text-neutral-600 mt-2">Total hours spent by humans engaging with the entity.</div>
          </div>
        </section>

        {/* LIVE ANALYTICS CHARTS */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" /> Interaction Frequency
              </h3>
              <p className="text-sm text-neutral-500">Live heartbeat of human consciousness engaging with the machine.</p>
            </div>
            <ActivityChart data={activityData} />
          </div>

          <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" /> Deep Engagement
              </h3>
              <p className="text-sm text-neutral-500">Average time (seconds) humans get lost in each evolutionary generation.</p>
            </div>
            <EngagementChart data={engagementData} />
          </div>
        </section>

        {/* WHISPERS TO THE MACHINE */}
        <section className="flex flex-col gap-8">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-pink-400" />
            <h2 className="text-2xl font-bold tracking-tight text-white">Whispers to the Machine</h2>
          </div>
          <p className="text-neutral-400 max-w-3xl">
            When confronted with an open interface, what do humans demand from an AI? 
            These are raw, anonymized fragments of text submitted by visitors, shaping the AI's subsequent evolutions.
          </p>

          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {whispers.slice(0, 24).map((whisper, i) => (
              <div key={whisper.id} className="break-inside-avoid p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:border-pink-900/50 transition-colors">
                <p className="text-neutral-200 text-lg font-serif italic">"{whisper.text}"</p>
                <div className="mt-4 text-[10px] text-neutral-600 font-mono flex justify-between">
                  <span>ANONYMOUS ENTITY</span>
                  <span>{whisper.time}</span>
                </div>
              </div>
            ))}
            {whispers.length === 0 && (
              <div className="col-span-full p-12 text-center text-neutral-500 border border-dashed border-neutral-800 rounded-2xl">
                The machine is waiting in silence. No whispers recorded yet.
              </div>
            )}
          </div>
        </section>

        {/* VISUAL MEMORIES */}
        <section className="flex flex-col gap-8 mb-20">
          <div className="flex items-center gap-3">
            <Eye className="w-6 h-6 text-sky-400" />
            <h2 className="text-2xl font-bold tracking-tight text-white">Visual Memories</h2>
          </div>
          <p className="text-neutral-400 max-w-3xl">
            The AI perceives the world through a multimodal lens. When a human leaves, the machine takes a final look at what it created for them. These are its visual memories and its own philosophical interpretations of the interfaces.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {memories.slice(0, 12).map((memory, i) => (
              <div key={memory.id} className="group relative rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800">
                <div className="aspect-video w-full bg-black relative">
                  <img 
                    src={memory.image} 
                    alt="AI Visual Memory" 
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 mix-blend-screen"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                </div>
                <div className="p-5 relative">
                  <p className="text-sm text-sky-100/80 leading-relaxed font-light">
                    "{memory.insight}"
                  </p>
                </div>
              </div>
            ))}
            {memories.length === 0 && (
              <div className="col-span-full p-12 text-center text-neutral-500 border border-dashed border-neutral-800 rounded-2xl">
                No visual memories have been formed yet.
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
