"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAccount } from "@/src/components/AccountProvider";

export function ActivityTracker() {
  const { status, user } = useAccount();
  const path = usePathname();
  const interaction = useRef(0);
  useEffect(() => {
    if (status !== "ready" && status !== "guest") return;
    interaction.current = 0;
    let stopped = false;
    let lastStudying = false;
    const signal = (studying: boolean) => {
      if (stopped) return;
      void fetch("/api/activity", { method: "POST", credentials: "same-origin", keepalive: true,
        headers: { "Content-Type": "application/json", ...(user ? { "X-Kiraquest-Account": user.id } : {}) },
        body: JSON.stringify({ studying }) }).catch(() => {});
    };
    const activeLesson = () => path === "/lessons" && new URLSearchParams(window.location.search).has("lesson");
    const onInteraction = (event: Event) => {
      if (activeLesson() && event.target instanceof Element && event.target.closest(".lesson-workspace")) interaction.current = Date.now();
    };
    const beat = () => { if (document.visibilityState === "visible") { lastStudying = activeLesson() && Date.now() - interaction.current < 60_000; signal(lastStudying); } };
    const visibility = () => { if (document.visibilityState === "hidden") { interaction.current = 0; if (lastStudying) signal(false); lastStudying = false; } else beat(); };
    document.addEventListener("pointerdown", onInteraction, true);
    document.addEventListener("keydown", onInteraction, true);
    document.addEventListener("input", onInteraction, true);
    document.addEventListener("visibilitychange", visibility);
    const first = window.setTimeout(beat, 250);
    const timer = window.setInterval(beat, 15_000);
    return () => {
      if (lastStudying) signal(false); stopped = true; window.clearTimeout(first); window.clearInterval(timer);
      document.removeEventListener("pointerdown", onInteraction, true);
      document.removeEventListener("keydown", onInteraction, true);
      document.removeEventListener("input", onInteraction, true);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [status, user, path]);
  return null;
}
