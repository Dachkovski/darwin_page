"use client";

export interface PageVariant {
  id: string;
  hero_headline: string;
  hero_subheadline: string;
  primary_cta_text: string;
  secondary_cta_text: string;
  value_propositions: string[];
  footer_text: string;
}

export default function LandingPageRenderer({ variant }: { variant: PageVariant }) {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-neutral-800">
      
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-6xl mx-auto">
        <div className="font-mono font-bold text-xl tracking-tight flex items-center gap-2">
          <div className="w-4 h-4 bg-white rounded-sm"></div>
          DarwinPage
        </div>
        <div className="text-sm font-mono text-neutral-500">
          v1.0.0-alpha
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-24 md:py-32 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 mb-8 font-mono">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          Autonomous Optimization Loop Active
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-6 bg-gradient-to-br from-white to-neutral-500 bg-clip-text text-transparent max-w-4xl">
          {variant.hero_headline}
        </h1>
        
        <p className="text-xl md:text-2xl text-neutral-400 mb-12 max-w-2xl leading-relaxed">
          {variant.hero_subheadline}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <button 
            onClick={() => {
              if ((window as any).trackEvent) {
                (window as any).trackEvent('cta_click');
              }
              alert('CTA Clicked! Event tracked.');
            }}
            className="px-8 py-4 bg-white text-black font-semibold rounded-lg hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
          >
            {variant.primary_cta_text}
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="mt-[1px]"><path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
          </button>
          <button className="px-8 py-4 bg-transparent border border-neutral-700 text-white font-semibold rounded-lg hover:bg-neutral-900 transition-colors">
            {variant.secondary_cta_text}
          </button>
        </div>
      </main>

      {/* Value Propositions */}
      <section className="border-t border-neutral-900 bg-neutral-950">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="grid md:grid-cols-3 gap-12">
            {(variant.value_propositions || []).map((vp, i) => (
              <div key={i} className="flex flex-col gap-4">
                <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 font-mono text-sm">
                  0{i + 1}
                </div>
                <h3 className="text-xl font-semibold text-white">{vp.split(':')[0]}</h3>
                <p className="text-neutral-400 leading-relaxed">{vp.split(':')[1] || vp}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-12 text-center text-neutral-500 font-mono text-sm">
        <p>{variant.footer_text}</p>
      </footer>
    </div>
  );
}
