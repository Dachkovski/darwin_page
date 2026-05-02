"use client";

export interface AppVariant {
  html: string;
  css: string;
  js: string;
}

export default function AppSandboxRenderer({ variant }: { variant: AppVariant }) {
  const srcDoc = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
  <style>
    body { margin: 0; padding: 0; overflow-x: hidden; background: #000; }
    /* Hide scrollbars for an app-like feel */
    ::-webkit-scrollbar { width: 0px; background: transparent; }
    ${variant.css || ''}
  </style>
  <script>
    // Darwin Telemetry Bridge
    window.darwin = {
      trackEvent: (eventType, metadata = {}) => {
        window.parent.postMessage({ type: 'DARWIN_EVENT', eventType, metadata }, '*');
      }
    };
    
    // Global error handler to catch LLM JS mistakes
    window.onerror = function(msg, url, lineNo, columnNo, error) {
      window.darwin.trackEvent('js_error', { error: msg, line: lineNo });
      return false;
    };
    // Global click tracker for the iframe
    document.addEventListener('click', function(e) {
      const target = e.target;
      const interactiveEl = target.closest('button, a, input, select, [role="button"]');
      if (interactiveEl) {
        // Capture all input values so the AI can read what the user typed
        const allInputs = Array.from(document.querySelectorAll('input, textarea, select'));
        const inputValues = allInputs.map(el => el.id + '=' + el.value).filter(val => !val.endsWith('='));
        
        window.darwin.trackEvent('interaction_click', {
          tag: interactiveEl.tagName.toLowerCase(),
          text: interactiveEl.innerText?.substring(0, 50) || interactiveEl.value || '',
          id: interactiveEl.id || '',
          className: interactiveEl.className || '',
          formState: inputValues.length > 0 ? inputValues.join(', ') : null,
          sceneState: window.darwin.sceneState || null,
          domText: document.body.innerText.replace(/\s+/g, ' ').substring(0, 150).trim()
        });
      }
    });
  </script>
</head>
<body>
  ${variant.html || ''}
  
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      try {
        ${variant.js || ''}
      } catch(e) {
        window.darwin.trackEvent('js_error', { error: e.message });
      }
    });
  </script>
</body>
</html>
  `;

  return (
    <iframe 
      srcDoc={srcDoc}
      className="w-full h-[100dvh] border-none block"
      sandbox="allow-scripts allow-same-origin allow-popups allow-modals allow-forms"
      title="Darwin Application Sandbox"
    />
  );
}
