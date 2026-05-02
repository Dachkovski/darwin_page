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

export default function Tracker({ variantId }: { variantId: string }) {
  const trackedScrolls = useRef(new Set<number>());
  const startTime = useRef(Date.now());

  useEffect(() => {
    // 1. Initialize IDs
    const visitorId = getOrGenerateId("darwin_visitor_id", localStorage);
    const sessionId = getOrGenerateId("darwin_session_id", sessionStorage);

    // Helper to send events
    const track = async (eventType: string, metadata?: any) => {
      try {
        await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorId,
            sessionId,
            variantId,
            eventType,
            metadata,
          }),
        });
      } catch (e) {
        console.error("Tracking failed", e);
      }
    };

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

    // Make track available globally so CTAs can call it
    (window as any).trackEvent = track;

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      delete (window as any).trackEvent;
    };
  }, [variantId]);

  return null; // Invisible component
}
