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
      finalVisitorId = localStorage.getItem("visitor_id") || crypto.randomUUID();
      localStorage.setItem("visitor_id", finalVisitorId);
    }

    let sessionId = sessionStorage.getItem("session_id");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("session_id", sessionId);
    }

    let eventQueue: any[] = [];
    let flushInterval: NodeJS.Timeout;

    const flushQueue = () => {
      if (eventQueue.length === 0) return;
      const payload = JSON.stringify({ events: eventQueue });
      
      // Use sendBeacon for reliable delivery, especially during page unload
      navigator.sendBeacon("/api/events", payload);
      eventQueue = [];
    };

    const track = (eventType: string, metadata: Record<string, any> = {}) => {
      eventQueue.push({
        visitorId: finalVisitorId,
        sessionId,
        variantId,
        eventType,
        metadataJson: JSON.stringify(metadata),
        timestamp: new Date().toISOString()
      });

      // Force flush if it's a critical exit event
      if (eventType === 'time_on_page' || eventType === 'bounce') {
        flushQueue();
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

    // 4. Track time on page / bounce on exit
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        const timeOnPage = Math.round((Date.now() - startTime.current) / 1000);
        track("time_on_page", { seconds: timeOnPage });
        
        // Simple bounce definition: left within 10 seconds without scrolling much
        if (timeOnPage < 10 && !trackedScrolls.current.has(25)) {
          track("bounce");
        }
      }
    };
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

    // 6. Listen for iframe sandbox events
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'DARWIN_EVENT') {
        track(e.data.eventType, e.data.metadata || {});
      }
    };
    window.addEventListener("message", handleMessage);

    // Make track available globally so CTAs can call it
    (window as any).trackEvent = track;

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("message", handleMessage);
      clearInterval(flushInterval);
      delete (window as any).trackEvent;
    };
  }, [variantId]);

  return null; // Invisible component
}
