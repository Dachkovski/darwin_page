"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export default function TimelineNode({ 
  title, 
  subtitle, 
  defaultOpen, 
  children 
}: { 
  title: string; 
  subtitle: string; 
  defaultOpen: boolean; 
  children: React.ReactNode 
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="relative flex flex-col gap-3">
      {/* Interactive Timeline Dot */}
      <div 
        className="absolute -left-[41px] top-1.5 w-4 h-4 rounded-full bg-neutral-950 border-2 border-neutral-600 flex items-center justify-center cursor-pointer hover:border-emerald-500 transition-colors z-10"
        onClick={() => setOpen(!open)}
      >
        <div className={`w-1.5 h-1.5 rounded-full transition-colors ${open ? 'bg-emerald-400' : 'bg-transparent'}`} />
      </div>

      {/* Header (Clickable) */}
      <div 
        className="flex items-center gap-2 mb-1 cursor-pointer group select-none" 
        onClick={() => setOpen(!open)}
      >
        <div className="text-neutral-500 group-hover:text-white transition-colors">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
        <span className={`text-sm font-bold tracking-wide transition-colors ${open ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-200'}`}>
          {title}
        </span>
        <span className="text-[10px] text-neutral-600 font-mono">({subtitle})</span>
        
        {!open && (
           <span className="text-[10px] text-neutral-600 ml-2 border border-neutral-800 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
             Click to expand
           </span>
        )}
      </div>

      {/* Collapsible Content */}
      {open && (
        <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ml-6">
          {children}
        </div>
      )}
    </div>
  );
}
