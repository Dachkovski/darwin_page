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
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <style>
    body { margin: 0; padding: 0; overflow-x: hidden; background: #000; }
    /* Hide scrollbars for an app-like feel */
    ::-webkit-scrollbar { width: 0px; background: transparent; }
    ${variant.css || ''}
  </style>
  <script>
    // Force all WebGL contexts to preserve drawing buffer so screenshots work!
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function() {
      if (arguments[0] === 'webgl' || arguments[0] === 'webgl2') {
        arguments[1] = Object.assign({}, arguments[1] || {}, { preserveDrawingBuffer: true });
      }
      return originalGetContext.apply(this, arguments);
    };

    // Darwin Telemetry Bridge
    window.darwin = {
      trackEvent: (eventType, metadata = {}) => {
        window.parent.postMessage({ type: 'DARWIN_EVENT', eventType, metadata }, '*');
      }
    };
    
    let startImg = null;
    let latestImg = null;
    function takeSnapshot(type) {
      try {
        if (window.html2canvas) {
          window.html2canvas(document.body, { scale: 0.3, logging: false }).then(c => {
            const img = c.toDataURL('image/jpeg', 0.3);
            if (type === 'start') startImg = img; else latestImg = img;
            window.parent.postMessage({ type: 'DARWIN_IMAGE', startImage: startImg, latestImage: latestImg }, '*');
          }).catch(e => {});
        }
      } catch(err){}
    }
    
    // Initial snapshot after rendering
    setTimeout(() => takeSnapshot('start'), 1500);

    // Global error handler to catch LLM JS mistakes
    window.onerror = function(msg, url, lineNo, columnNo, error) {
      window.darwin.trackEvent('js_error', { error: msg, line: lineNo });
      return false;
    };
    // Global click tracker for the iframe
    document.addEventListener('click', function(e) {
      takeSnapshot('latest');
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
          formState: inputValues.length > 0 ? inputValues.join(', ') : null
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
