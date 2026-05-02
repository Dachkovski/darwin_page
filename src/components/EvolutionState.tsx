export default function EvolutionState() {
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-neutral-900/80 backdrop-blur-md border border-neutral-800 text-neutral-300 text-xs p-4 rounded-xl shadow-2xl w-72 font-mono flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1 border-b border-neutral-800 pb-2">
        <span className="font-semibold text-white tracking-widest uppercase text-[10px]">Current Evolution State</span>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </div>
      
      <div className="flex justify-between">
        <span className="text-neutral-500">Generation:</span>
        <span className="text-white">1</span>
      </div>
      <div className="flex justify-between">
        <span className="text-neutral-500">Variant:</span>
        <span className="text-white">hero_a_001</span>
      </div>
      <div className="flex justify-between">
        <span className="text-neutral-500">Optimizing for:</span>
        <span className="text-white text-right">CTA Click Rate +<br/>Scroll Depth</span>
      </div>
      <div className="flex justify-between mt-1 pt-2 border-t border-neutral-800/50">
        <span className="text-neutral-500">Current Score:</span>
        <span className="text-emerald-400 font-bold">0.00</span>
      </div>
      <div className="mt-2 text-[10px] text-neutral-500 italic">
        Last Mutation: Initial Seed
      </div>
    </div>
  );
}
