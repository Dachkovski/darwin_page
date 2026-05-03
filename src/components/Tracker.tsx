"use client";

import { useEffect, useRef } from "react";

function getOrGenerateId(key: string, storage: Storage): string {
  let id = storage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    storage.setItem(key, id);
  }
  return id;
}
export default function Tracker({ variantId, visitorId }: { variantId: string, visitorId?: string }) {
  const trackedScrolls = useRef(new Set<number>());
  const startTime = useRef(Date.now());

  useEffect(() => {
    // 1. Determine Visitor ID
    let finalVisitorId = visitorId;
    if (!finalVisitorId) {
      // Check cookie first just in case
      finalVisitorId = document.cookie.split('; ').find(row => row.startsWith('visitor_id='))?.split('=')[1];
      if (!finalVisitorId) {
        finalVisitorId = localStorage.getItem("visitor_id") || crypto.randomUUID();
        document.cookie = `visitor_id=${finalVisitorId}; path=/; max-age=31536000`;
      }
      localStorage.setItem("visitor_id", finalVisitorId);
    }

    let sessionId = sessionStorage.getItem("session_id");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("session_id", sessionId);
    }

    let eventQueue: any[] = [];
    let flushInterval: NodeJS.Timeout;

    let startImage: string | null = null;
    let latestImage: string | null = null;

    const flushQueue = (isExit = false) => {
      if (eventQueue.length === 0 && !isExit) return;
      
      const payloadObj: any = { events: eventQueue };
      if (isExit) {
        payloadObj.startImage = startImage;
        payloadObj.latestImage = latestImage;
        payloadObj.isExit = true;
      }
      
      const payload = JSON.stringify(payloadObj);
      
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: isExit
      }).catch(e => console.error("Tracking error:", e));
      eventQueue = [];
    };

    const track = (eventType: string, metadata: Record<string, any> = {}, isExit = false) => {
      eventQueue.push({
        visitorId: finalVisitorId,
        sessionId,
        variantId,
        eventType,
        metadataJson: JSON.stringify(metadata),
        timestamp: new Date().toISOString()
      });

      if (isExit) {
        flushQueue(true);
      } else if (eventType === 'bounce') {
        flushQueue(false);
      }
    };

    // Auto-flush every 5 seconds to reduce server load
    flushInterval = setInterval(flushQueue, 5000);

    // 2. Track initial view
    track("page_view");
    track("variant_seen");

    // 3. Track scroll depth
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = window.scrollY;
      const percentage = (scrolled / scrollHeight) * 100;

      const milestones = [25, 50, 75, 100];
      for (const milestone of milestones) {
        if (percentage >= milestone && !trackedScrolls.current.has(milestone)) {
          trackedScrolls.current.add(milestone);
          track(`scroll_depth_${milestone}`);
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // 4. Track active time on page / bounce on exit
    let accumulatedActiveTime = 0;
    let lastActiveStartTime = Date.now();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // User switched tabs or minimized
        const timeSinceLastActive = Math.round((Date.now() - lastActiveStartTime) / 1000);
        accumulatedActiveTime += timeSinceLastActive;
        
        // Simple bounce definition: left within 10 seconds of active time without scrolling much
        if (accumulatedActiveTime < 10 && !trackedScrolls.current.has(25)) {
          track("bounce", {}, true);
        } else {
          track("time_on_page", { seconds: accumulatedActiveTime }, true);
        }
      } else {
        // User came back to the tab, restart the active timer
        lastActiveStartTime = Date.now();
      }
    };
    
    // Also track periodically every 15 seconds to ensure we capture time even if they don't hide the tab
    const activeTimeInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        const timeSinceLastActive = Math.round((Date.now() - lastActiveStartTime) / 1000);
        const currentActiveTime = accumulatedActiveTime + timeSinceLastActive;
        track("time_on_page", { seconds: currentActiveTime });
      }
    }, 15000);

    window.addEventListener("visibilitychange", handleVisibilityChange);

    // 5. Global Interaction Tracker (Heatmap / Dead Clicks)
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Determine if it's meant to be clickable
      const isInteractive = 
        target.tagName === 'BUTTON' || 
        target.tagName === 'A' || 
        target.closest('button') !== null || 
        target.closest('a') !== null;

      // Ignore the internal Admin/Evolution State widget
      if (target.closest('.fixed.bottom-4')) return;

      let textContent = target.innerText || target.textContent || "";
      textContent = textContent.trim().substring(0, 60).replace(/\n/g, ' '); // Clean up text

      // Don't track clicks on completely empty backgrounds
      if (!textContent && target.tagName === 'DIV') return;

      track("interaction_click", {
        tag: target.tagName,
        text: textContent || "no text",
        isInteractive
      });
    };
    window.addEventListener("click", handleGlobalClick);

    // 5.b Form Input Tracker
    const handleInputChange = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (!target) return;

      // Skip password fields for security
      if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'password') return;

      const value = target.value?.substring(0, 100); // Limit length
      const fieldName = target.name || target.id || target.getAttribute('placeholder') || "unknown_field";

      if (value) {
        track("form_input", {
          field: fieldName,
          value: value,
          tag: target.tagName
        });
      }
    };
    // Use 'change' event to capture final input when user clicks away or submits, avoiding spamming every keystroke
    window.addEventListener("change", handleInputChange);

    // 6. Listen for iframe sandbox events
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'DARWIN_EVENT') {
        track(e.data.eventType, e.data.metadata || {});
      } else if (e.data?.type === 'DARWIN_IMAGE') {
        if (e.data.startImage) startImage = e.data.startImage;
        if (e.data.latestImage) latestImage = e.data.latestImage;
      }
    };
    window.addEventListener("message", handleMessage);

    // Make track available globally so CTAs can call it
    (window as any).trackEvent = track;

    // 7. Auto-reload when new evolution is ready
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/version?visitorId=${finalVisitorId}`);
        const data = (await res.json()) as any;
        if (data.latestVariantId && data.latestVariantId !== variantId) {
          window.location.reload();
        }
      } catch (e) {}
    }, 5000);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("change", handleInputChange);
      window.removeEventListener("message", handleMessage);
      clearInterval(flushInterval);
      clearInterval(pollInterval);
      clearInterval(activeTimeInterval);
      delete (window as any).trackEvent;
    };
  }, [variantId]);

  return null; // Invisible component
}
