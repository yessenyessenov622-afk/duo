"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { mascotPreviews } from "@/src/data/mascots";
import { RenIllustration } from "@/src/components/RenIllustration";

export type MascotState = "idle" | "greet" | "thinking" | "correct" | "support" | "celebrate" | "rest";

function Character({ species, accessory }: { species: string; accessory: string }) {
  const eye = <g className="mascot-eyes"><ellipse cx="62" cy="68" rx="6" ry="9" fill="#302a3a"/><ellipse cx="96" cy="68" rx="6" ry="9" fill="#302a3a"/><circle cx="64" cy="65" r="2" fill="white"/><circle cx="98" cy="65" r="2" fill="white"/><path d="M73 83q6 5 12 0" fill="none" stroke="#754c58" strokeWidth="3" strokeLinecap="round"/></g>;
  const glasses = accessory === "glasses" && <g className="mascot-accessory-svg" fill="none" stroke="#536c78" strokeWidth="3"><circle cx="62" cy="68" r="10"/><circle cx="96" cy="68" r="10"/><path d="M72 68h14m-29-4-8-3m49 7 10-4"/></g>;
  const scarf = accessory === "scarf" && <g className="mascot-accessory-svg"><path d="M49 101q30 14 61 0v11q-30 15-61 0Z" fill="#d87887"/><path d="m91 108 17 3-3 20-12-3Z" fill="#e8929d"/></g>;
  const pin = accessory === "star" && <path className="mascot-accessory-svg" d="m107 38 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z" fill="#f3c95e" stroke="#fff" strokeWidth="2"/>;
  const halo = accessory === "halo" && <ellipse className="mascot-accessory-svg" cx="80" cy="25" rx="22" ry="7" fill="none" stroke="#e5bc59" strokeWidth="4"/>;

  if (species === "cat") return <svg viewBox="7 7 146 146" className="mascot-illustration" aria-hidden="true">
    <ellipse cx="80" cy="137" rx="45" ry="8" fill="#443657" opacity=".12"/>
    <path className="part-tail" d="M111 116q30 2 26-22-2-11-13-7 9 9-4 14-9 3-15-2" fill="none" stroke="#bc91da" strokeWidth="12" strokeLinecap="round"/><path d="M135 96q3-8-5-10" fill="none" stroke="#fff0dc" strokeWidth="6" strokeLinecap="round"/>
    <path d="M45 126q-5-24 8-40h53q15 15 9 40-17 9-36 7-20 2-34-7Z" fill="#c8a5e1" stroke="#9273ae" strokeWidth="2"/><path d="M58 124q2-16 12-20m31 20q-1-14-10-20" fill="none" stroke="#f4e6ff" strokeWidth="9" strokeLinecap="round"/>
    <g className="part-head"><path d="M43 57 39 23q1-8 10-3l23 19m17 0 24-19q8-5 9 4l-5 34" fill="#d7b8eb" stroke="#9273ae" strokeWidth="3" strokeLinejoin="round"/><path d="m49 47-2-18 17 14m42 4 3-19-18 15" fill="#f29ab1"/>
      <path d="M38 66q0-31 42-34 42 3 42 34v17q-2 33-42 34-40-1-42-34Z" fill="#ead8f5" stroke="#9273ae" strokeWidth="3"/>{eye}<path d="M38 78q-12-8-13 3 0 10 14 9m83-12q13-8 14 3 0 10-14 9" fill="#ead8f5" stroke="#9273ae" strokeWidth="3"/><path d="m77 78 3 3 3-3" fill="#d9829c"/><path d="M49 87h9m44 0h9" stroke="#dc91a7" strokeWidth="3" strokeLinecap="round"/><path d="M41 76q-7-4-10-2m10 8-11 1m89-7q7-4 10-2m-10 8 11 1" fill="none" stroke="#987c9e" strokeWidth="2" strokeLinecap="round"/>{glasses}{pin}</g>{scarf}{halo}
  </svg>;

  if (species === "fox") return <RenIllustration accessory={accessory} />;

  if (species === "owl") return <svg viewBox="7 7 146 146" className="mascot-illustration" aria-hidden="true">
    <ellipse cx="80" cy="138" rx="41" ry="8" fill="#33384f" opacity=".12"/><path d="M42 119q-19-2-22-27 17 5 24 14m74 13q19-2 22-27-17 5-24 14" fill="#8795c5" stroke="#58678f" strokeWidth="3"/><path className="part-wing" d="M48 91q-20 3-22 28 13 4 25-3m61-25q20 3 22 28-13 4-25-3" fill="#9eadd7" stroke="#58678f" strokeWidth="3"/><path d="M44 124q-8-25 1-51 12-30 35-31 23 1 35 31 9 26 1 51-15 11-36 9-21 2-36-9Z" fill="#9ba9d1" stroke="#58678f" strokeWidth="3"/><path d="M80 51q-31 0-36 33 8 28 36 32 28-4 36-32-5-33-36-33Z" fill="#f7f1df"/><path d="M48 48 41 30q13 1 22 10m49 8 7-18q-13 1-22 10" fill="#9ba9d1" stroke="#58678f" strokeWidth="3"/><g className="mascot-eyes"><circle cx="64" cy="71" r="13" fill="#fff" stroke="#58678f" strokeWidth="2"/><circle cx="96" cy="71" r="13" fill="#fff" stroke="#58678f" strokeWidth="2"/><circle cx="65" cy="72" r="6" fill="#33384f"/><circle cx="95" cy="72" r="6" fill="#33384f"/><circle cx="67" cy="69" r="2" fill="#fff"/><circle cx="97" cy="69" r="2" fill="#fff"/><path d="m74 84 6 7 6-7Z" fill="#e6aa57"/></g><path d="M64 123q-5 6-8 9m40-9q5 6 8 9" fill="none" stroke="#e6aa57" strokeWidth="4" strokeLinecap="round"/>{pin}{halo}
  </svg>;

  if (species === "dragon") return <svg viewBox="7 7 146 146" className="mascot-illustration" aria-hidden="true">
    <ellipse cx="80" cy="138" rx="43" ry="8" fill="#3e355c" opacity=".13"/><path className="part-wing" d="M54 72 28 46q-5-4-6 5l2 20q-5 17 13 26l19-9m60-16 26-26q5-4 6 5l-2 20q5 17-13 26l-19-9" fill="#b99be8" stroke="#7762aa" strokeWidth="3"/><path className="part-tail" d="M105 117q28 16 37-3l-12-3 9-10q-21-6-35 2" fill="none" stroke="#9173cf" strokeWidth="9" strokeLinecap="round"/>
    <path d="M47 126q-5-24 7-43h52q12 20 7 43-17 9-33 6-17 3-33-6Z" fill="#ad91e0" stroke="#7762aa" strokeWidth="3"/><path d="M62 119q-7 6-9 13m43-13q7 6 9 13" fill="none" stroke="#f5c75f" strokeWidth="5" strokeLinecap="round"/><g className="part-head"><path d="m50 47-9-21q17 1 27 10m42 11 9-21q-17 1-27 10" fill="#8d72cc" stroke="#7762aa" strokeWidth="3"/><path d="m68 40-2-15 13 9m17 6 3-15-13 9" fill="#f4c962" stroke="#c79d41" strokeWidth="2"/><path d="M38 67q1-30 42-34 41 4 42 34v15q-4 33-42 36Q42 115 38 82Z" fill="#b49bdf" stroke="#7762aa" strokeWidth="3"/>{eye}<path d="M52 87q28 16 56 0-6 20-28 21-22-1-28-21Z" fill="#fff1dd"/><path d="m76 80 4 3 4-3" fill="#6f4f72"/><path d="M48 70q-9-10-13 0m77 0q9-10 13 0" fill="#9177c7" stroke="#7762aa" strokeWidth="2"/>{glasses}{pin}</g>{scarf}{halo}
  </svg>;

  if (species === "robot") return <svg viewBox="7 7 146 146" className="mascot-illustration" aria-hidden="true">
    <ellipse cx="80" cy="138" rx="44" ry="8" fill="#31574f" opacity=".13"/><path className="part-arm" d="M48 100 28 112l8 15 22-12m54-15 20 13-8 15-22-13" fill="none" stroke="#4f9a8a" strokeWidth="11" strokeLinecap="round"/><path d="M50 123q-5-22 6-32h48q11 10 6 32-15 11-30 8-15 3-30-8Z" fill="#81cabc" stroke="#4d8e82" strokeWidth="3"/><path d="M61 116h38" stroke="#e9f9f4" strokeWidth="5" strokeLinecap="round"/><path d="M80 37V26m0 0q-8-7 0-12 9 5 0 12Z" fill="#e7a85c" stroke="#56887e" strokeWidth="3"/><g className="part-head"><rect x="39" y="34" width="82" height="70" rx="22" fill="#b9e6dc" stroke="#4d8e82" strokeWidth="4"/><path d="M49 41 43 34m68 7 6-7" fill="none" stroke="#70b9aa" strokeWidth="5" strokeLinecap="round"/><rect x="48" y="49" width="64" height="37" rx="13" fill="#355c61"/><g className="mascot-eyes"><ellipse cx="65" cy="67" rx="5" ry="7" fill="#a5f1e1"/><ellipse cx="95" cy="67" rx="5" ry="7" fill="#a5f1e1"/><circle cx="66" cy="65" r="2" fill="white"/><circle cx="96" cy="65" r="2" fill="white"/><path d="M73 77h14" stroke="#a5f1e1" strokeWidth="3" strokeLinecap="round"/></g><circle cx="48" cy="95" r="3" fill="#e6b556"/><circle cx="112" cy="95" r="3" fill="#e6b556"/>{glasses}{pin}</g>{scarf}{halo}
  </svg>;

  if (species === "spirit") return <svg viewBox="7 7 146 146" className="mascot-illustration" aria-hidden="true">
    <ellipse cx="80" cy="139" rx="38" ry="7" fill="#5983a1" opacity=".1"/><path className="part-tail" d="M51 117q-13 17-18 1m75-1q13 17 18 1" fill="none" stroke="#8fc4df" strokeWidth="7" strokeLinecap="round"/><path d="M80 34q39 0 42 38v32q-3 27-42 33-39-6-42-33V72q3-38 42-38Z" fill="#eaf8ff" stroke="#83b7d2" strokeWidth="3"/><path className="part-arm" d="M46 91q-15 4-14 17 2 10 15 6m67-23q15 4 14 17-2 10-15 6" fill="none" stroke="#83b7d2" strokeWidth="7" strokeLinecap="round"/>{eye}<path d="M67 95q13 7 26 0" fill="none" stroke="#9bb7cc" strokeWidth="2" strokeLinecap="round"/><circle cx="49" cy="50" r="4" fill="#fff"/><circle cx="117" cy="62" r="3" fill="#fff"/>{pin}{halo}
  </svg>;

  if (species === "bird") return <svg viewBox="7 7 146 146" className="mascot-illustration" aria-hidden="true">
    <ellipse cx="80" cy="138" rx="38" ry="8" fill="#844c5b" opacity=".11"/><path className="part-wing" d="M54 90q-23 2-25 25 18 7 31-4m46-21q23 2 25 25-18 7-31-4" fill="#f3a7b8" stroke="#bc6e87" strokeWidth="3"/><path d="m102 109 28-18-3 29-23 6" fill="#dc8eaa" stroke="#bc6e87" strokeWidth="3"/><path d="M48 126q-9-20-4-45 8-34 36-35 28 1 36 35 5 25-4 45-15 10-32 8-17 2-32-8Z" fill="#ffd5df" stroke="#bc6e87" strokeWidth="3"/><path d="m69 39 11-15 11 15" fill="#f1bd59" stroke="#bc6e87" strokeWidth="2"/>{eye}<path d="m73 83 7 8 7-8Z" fill="#e6a64f"/><path d="M62 125q-6 4-9 9m45-9q6 4 9 9" fill="none" stroke="#e6a64f" strokeWidth="4" strokeLinecap="round"/>{pin}{halo}
  </svg>;

  return null;
}

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
    <Character species={mascot.species} accessory={accessory} />
  </div>;
}
