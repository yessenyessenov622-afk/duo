"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { mascotPreviews } from "@/src/data/mascots";

export type MascotState = "idle" | "greet" | "thinking" | "correct" | "support" | "celebrate" | "rest" | "progress";

export function MascotAvatar({ id, accessory = "none", className = "", state = "idle", pose = "calm", reducedMotion = false }: { id: string; accessory?: string; className?: string; state?: MascotState; pose?: "calm" | "curious"; reducedMotion?: boolean }) {
  const mascot = mascotPreviews.find((entry) => entry.id === id) ?? mascotPreviews[0];
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: "80px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const update = () => setTabVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  return <div ref={rootRef} className={`mascot-avatar mascot-${mascot.species} mascot-state-${state} mascot-pose-${pose}${reducedMotion || !inView || !tabVisible ? " mascot-still" : ""} ${className}`} style={{ "--mascot-bg": mascot.color } as CSSProperties} aria-hidden="true">
    {mascot.id === "neo" ? <>
      <img className="neo-illustration" src={`/mascots/neo-${state === "idle" || state === "thinking" ? "study" : state === "correct" || state === "celebrate" ? "celebrate" : state}.png`} alt="" />
      {accessory !== "none" && <span className="neo-accessory" aria-hidden="true">{({ glasses: "◉", scarf: "❣", star: "★", halo: "◌" } as Record<string, string>)[accessory]}</span>}
    </> : <><img className="team-illustration" src={`/mascots/${mascot.id}${state === "greet" ? "" : `-${state === "idle" || state === "thinking" ? "study" : state === "correct" || state === "celebrate" ? "celebrate" : state}`}.png`} alt="" />{accessory !== "none" && <span className="neo-accessory" aria-hidden="true">{({ glasses: "◉", scarf: "❣", star: "★", halo: "◌" } as Record<string, string>)[accessory]}</span>}</>}
  </div>;
}
