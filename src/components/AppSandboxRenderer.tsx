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
      sandbox="allow-scripts allow-same-origin allow-popups"
      title="Darwin Application Sandbox"
    />
  );
}
