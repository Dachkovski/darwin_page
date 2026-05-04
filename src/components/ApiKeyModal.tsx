"use client";

import { useState, useEffect } from "react";
import { Key } from "lucide-react";

export default function ApiKeyModal({ personalVariantCount = 0, maxFreeGenerations = 3 }: { personalVariantCount?: number, maxFreeGenerations?: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    const storedKey = document.cookie.split('; ').find(row => row.startsWith('openai_api_key='));
    if (!storedKey && personalVariantCount >= maxFreeGenerations) {
      setIsOpen(true);
    }
  }, [personalVariantCount, maxFreeGenerations]);

  const handleSave = () => {
    if (apiKey.trim().startsWith("sk-")) {
      document.cookie = `openai_api_key=${apiKey.trim()}; path=/; max-age=31536000; secure; samesite=strict`;
      setIsOpen(false);
      window.location.reload();
    } else {
      alert("Invalid API Key format. Must start with 'sk-'");
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-black/50 hover:bg-black p-2 rounded-full border border-neutral-800 transition-all text-neutral-400 hover:text-white backdrop-blur-md"
        title="Set OpenAI API Key"
      >
        <Key className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 border border-neutral-700 p-8 rounded-2xl max-w-md w-full flex flex-col gap-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-900/30 rounded-xl text-emerald-400">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Bring Your Own Key</h2>
            <p className="text-neutral-400 text-sm">Enable AI Evolution</p>
          </div>
        </div>

        <p className="text-sm text-neutral-300 leading-relaxed">
          The Darwin Engine requires an OpenAI API Key to autonomously generate new UI variants and analyze your screen. 
          <br /><br />
          <strong className="text-white">Your key is stored locally in your browser</strong> and only sent to the backend when an evolution is triggered.
        </p>

        <div className="flex flex-col gap-2">
          <input 
            type="password" 
            placeholder="sk-..." 
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full bg-black border border-neutral-700 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500 font-mono text-sm"
          />
        </div>

        <div className="flex gap-3 mt-2">
          <button 
            onClick={() => setIsOpen(false)}
            className="flex-1 py-3 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 transition-colors font-medium text-sm"
          >
            Skip for now
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 py-3 bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors font-bold text-sm shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            Save Key
          </button>
        </div>
      </div>
    </div>
  );
}
