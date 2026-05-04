export const runtime = 'edge';
import AppSandboxRenderer, { AppVariant } from "@/components/AppSandboxRenderer";
import EvolutionState from "@/components/EvolutionState";
import Tracker from "@/components/Tracker";
import ApiKeyModal from "@/components/ApiKeyModal";
import { db } from "@/db";
import { variants, optimizationConfigs } from "@/db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { cookies } from "next/headers";

const FALLBACK_APP: AppVariant = {
  html: "<div style='color:white;text-align:center;margin-top:20%'><h1>App Engine Booting...</h1></div>",
  css: "body { background: black; }",
  js: ""
};

import { Info } from "lucide-react";

export default async function Home() {
  let activeVariantData: AppVariant = FALLBACK_APP;
  let generation = 1;
  let score = 0;
  let lastMutation = "Genesis";
  const cookieStore = await cookies();
  const visitorId = cookieStore.get('visitor_id')?.value;

  const adminToken = cookieStore.get('admin_token')?.value;
  const authPassword = process.env.ADMIN_PASSWORD;
  const isAdmin = !!(authPassword && adminToken === authPassword);

  let personalVariantCount = 0;

  try {
    let activeVariantsList: any[] = [];
    
    // First, try to find a personalized variant for this specific user
    if (visitorId) {
      const personalVariants = await db
        .select()
        .from(variants)
        .where(eq(variants.visitorId, visitorId));
        
      personalVariantCount = personalVariants.length;

      activeVariantsList = personalVariants
        .filter(v => v.status === 'active')
        .sort((a, b) => b.generation - a.generation)
        .slice(0, 1);
    }

    // If no personalized variant exists, fall back to the global active variant
    if (activeVariantsList.length === 0) {
      activeVariantsList = await db
        .select()
        .from(variants)
        .where(and(eq(variants.status, 'active'), isNull(variants.visitorId)))
        .orderBy(desc(variants.generation))
        .limit(1);
    }

    if (activeVariantsList.length > 0) {
      const v = activeVariantsList[0];
      activeVariantData = JSON.parse(v.contentJson) as AppVariant;
      // Inject ID for tracking
      (activeVariantData as any).id = v.id;
      generation = v.generation;
      lastMutation = v.mutationReason || "Unknown";
    }
  } catch (error) {
    console.error("Error fetching variant:", error);
  }

  const trackingId = (activeVariantData as any).id || "fallback";

  let activeMetricName = "Unknown Metric";
  let maxFreeGenerations = 3;
  try {
    const configs = await db.select().from(optimizationConfigs).limit(1);
    if (configs.length > 0) {
      if (configs[0].activeMetricName) activeMetricName = configs[0].activeMetricName;
      maxFreeGenerations = configs[0].maxFreeGenerations;
    }
  } catch(e) {}

  return (
    <>
      {/* AI Sandbox Info Bubble */}
      <div tabIndex={0} className="fixed top-4 left-4 z-[9999] group outline-none">
        <div className="w-10 h-10 rounded-full bg-emerald-600/80 backdrop-blur text-white flex items-center justify-center cursor-pointer shadow-lg border border-emerald-400/50 hover:bg-emerald-500 transition-colors">
          <Info size={20} />
        </div>
        <div className="absolute top-12 left-0 w-72 p-5 bg-black/90 backdrop-blur-md border border-neutral-800 rounded-2xl text-xs text-neutral-300 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-all duration-300 pointer-events-none shadow-2xl scale-95 group-hover:scale-100 group-focus:scale-100 origin-top-left">
          <h3 className="text-white font-bold mb-2 text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Autonomous AI Sandbox
          </h3>
          <p className="mb-2 leading-relaxed">
            You are experiencing a webpage that is writing its own code. There are no human developers here.
          </p>
          <p className="leading-relaxed">
            An AI agent is continuously monitoring your interactions (clicks, scroll depth) and visual feedback. It uses this data to iteratively mutate the HTML, CSS, and JS in real-time to optimize your experience.
          </p>
        </div>
      </div>

      {/* Unalterable Fixed Badges */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
        <a href="https://github.com/Dachkovski/darwin_page" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-neutral-900/80 backdrop-blur border border-neutral-700 rounded-full text-xs font-mono text-white flex items-center gap-2 hover:bg-neutral-800 transition-colors shadow-lg">
          <span>GitHub Repo</span>
        </a>
        <a href="/journey" className="px-3 py-1.5 bg-cyan-900/80 backdrop-blur border border-cyan-700 rounded-full text-xs font-mono text-cyan-100 flex items-center gap-2 hover:bg-cyan-800 transition-colors shadow-lg">
          <span>My Journey</span>
        </a>
        <a href="/insights" className="px-3 py-1.5 bg-purple-900/80 backdrop-blur border border-purple-700 rounded-full text-xs font-mono text-purple-100 flex items-center gap-2 hover:bg-purple-800 transition-colors shadow-lg">
          <span>Public Pulse</span>
        </a>
      </div>

      {!isAdmin && <ApiKeyModal personalVariantCount={personalVariantCount} maxFreeGenerations={maxFreeGenerations} />}
      <Tracker variantId={trackingId} visitorId={visitorId} />
      <AppSandboxRenderer variant={activeVariantData} />
      <EvolutionState 
        generation={generation}
        variantId={trackingId}
        score={score}
        lastMutation={lastMutation}
        activeMetricName={activeMetricName}
      />
    </>
  );
}
