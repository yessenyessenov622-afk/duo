"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { mascotPreviews } from "@/src/data/mascots";
import { RenIllustration } from "@/src/components/RenIllustration";

export type MascotState = "idle" | "greet" | "thinking" | "correct" | "support" | "celebrate" | "rest";

function Character({ species, accessory }: { species: string; accessory: string }) {
  const eye = <g className="mascot-eyes"><ellipse cx="62" cy="68" rx="6" ry="9" fill="#302a3a"/><ellipse cx="96" cy="68" rx="6" ry="9" fill="#302a3a"/><circle cx="64" cy="65" r="2" fill="white"/><circle cx="98" cy="65" r="2" fill="white"/><path d="M73 83q6 5 12 0" fill="none" stroke="#754c58" strokeWidth="2.4" strokeLinecap="round"/></g>;
  const glasses = accessory === "glasses" && <g className="mascot-accessory-svg" fill="none" stroke="#536c78" strokeWidth="2.4"><circle cx="62" cy="68" r="10"/><circle cx="96" cy="68" r="10"/><path d="M72 68h14m-29-4-8-3m49 7 10-4"/></g>;
  const scarf = accessory === "scarf" && <g className="mascot-accessory-svg"><path d="M49 101q30 14 61 0v11q-30 15-61 0Z" fill="#d87887"/><path d="m91 108 17 3-3 20-12-3Z" fill="#e8929d"/></g>;
  const pin = accessory === "star" && <path className="mascot-accessory-svg" d="m107 38 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z" fill="#f3c95e" stroke="#fff" strokeWidth="2"/>;
  const halo = accessory === "halo" && <ellipse className="mascot-accessory-svg" cx="80" cy="25" rx="22" ry="7" fill="none" stroke="#e5bc59" strokeWidth="2.8"/>;

  if (species === "cat") return <svg viewBox="7 7 146 146" className="mascot-illustration" aria-hidden="true">
    <ellipse cx="80" cy="137" rx="45" ry="8" fill="#443657" opacity=".12"/>
    <path className="part-tail" d="M111 116q30 2 26-22-2-11-13-7 9 9-4 14-9 3-15-2" fill="none" stroke="#bc91da" strokeWidth="12" strokeLinecap="round"/><path d="M135 96q3-8-5-10" fill="none" stroke="#fff0dc" strokeWidth="6" strokeLinecap="round"/>
    <path className="part-body" d="M45 126q-5-24 8-40h53q15 15 9 40-17 9-36 7-20 2-34-7Z" fill="#c8a5e1" stroke="#9a83b0" strokeWidth="2"/><path d="M58 124q2-16 12-20m31 20q-1-14-10-20" fill="none" stroke="#f4e6ff" strokeWidth="9" strokeLinecap="round"/>
    <g className="part-head"><path d="M43 57 39 23q1-8 10-3l23 19m17 0 24-19q8-5 9 4l-5 34" fill="#d7b8eb" stroke="#9a83b0" strokeWidth="2.4" strokeLinejoin="round"/><path d="m49 47-2-18 17 14m42 4 3-19-18 15" fill="#f29ab1"/>
      <path d="M38 66q0-31 42-34 42 3 42 34v17q-2 33-42 34-40-1-42-34Z" fill="#ead8f5" stroke="#9a83b0" strokeWidth="2.4"/>{eye}<path d="M38 78q-12-8-13 3 0 10 14 9m83-12q13-8 14 3 0 10-14 9" fill="#ead8f5" stroke="#9a83b0" strokeWidth="2.4"/><path d="m77 78 3 3 3-3" fill="#d9829c"/><path d="M49 87h9m44 0h9" stroke="#dc91a7" strokeWidth="2.4" strokeLinecap="round"/><path d="M41 76q-7-4-10-2m10 8-11 1m89-7q7-4 10-2m-10 8 11 1" fill="none" stroke="#987c9e" strokeWidth="2" strokeLinecap="round"/>{glasses}{pin}</g>{scarf}{halo}
  </svg>;

  if (species === "fox") return <RenIllustration accessory={accessory} />;

  if (species === "owl") return <svg viewBox="7 7 146 146" className="mascot-illustration" aria-hidden="true">
    <ellipse cx="80" cy="138" rx="41" ry="8" fill="#33384f" opacity=".12"/><path d="M42 119q-19-2-22-27 17 5 24 14m74 13q19-2 22-27-17 5-24 14" fill="#8795c5" stroke="#7682a0" strokeWidth="2.4"/><path className="part-wing" d="M48 91q-20 3-22 28 13 4 25-3m61-25q20 3 22 28-13 4-25-3" fill="#9eadd7" stroke="#7682a0" strokeWidth="2.4"/><path className="part-body" d="M44 124q-8-25 1-51 12-30 35-31 23 1 35 31 9 26 1 51-15 11-36 9-21 2-36-9Z" fill="#9ba9d1" stroke="#7682a0" strokeWidth="2.4"/><path d="M80 51q-31 0-36 33 8 28 36 32 28-4 36-32-5-33-36-33Z" fill="#f7f1df"/><path d="M48 48 41 30q13 1 22 10m49 8 7-18q-13 1-22 10" fill="#9ba9d1" stroke="#7682a0" strokeWidth="2.4"/><g className="mascot-eyes"><circle cx="64" cy="71" r="13" fill="#fff" stroke="#7682a0" strokeWidth="2"/><circle cx="96" cy="71" r="13" fill="#fff" stroke="#7682a0" strokeWidth="2"/><circle cx="65" cy="72" r="6" fill="#33384f"/><circle cx="95" cy="72" r="6" fill="#33384f"/><circle cx="67" cy="69" r="2" fill="#fff"/><circle cx="97" cy="69" r="2" fill="#fff"/><path d="m74 84 6 7 6-7Z" fill="#e6aa57"/></g><path d="M64 123q-5 6-8 9m40-9q5 6 8 9" fill="none" stroke="#e6aa57" strokeWidth="2.8" strokeLinecap="round"/>{pin}{halo}
  </svg>;

  if (species === "dragon") return <svg viewBox="7 7 146 146" className="mascot-illustration mascot-dragon-art" aria-hidden="true">
    <ellipse className="dragon-ground-shadow" cx="80" cy="139" rx="42" ry="6" fill="#554b69" opacity=".12"/>
    <g className="dragon-tail-part part-tail">
      <path d="M108 119c17 7 32 3 34-8 2-8-3-14-10-13-5 0-8 4-7 8" fill="none" stroke="#897bb9" strokeWidth="12" strokeLinecap="round"/>
      <path d="M134 103c5-3 9 1 8 6-1 4-4 7-8 9 3-5 1-8-3-8-3 0-5 2-5 5-2-5 1-10 8-12Z" fill="#b9aadf"/>
    </g>
    <g className="part-wing part-wing-left">
      <path d="M68 77C52 58 36 48 27 51c-6 2-3 11 4 17-10-1-14 3-11 9 3 6 11 8 19 6-5 9-2 16 5 18 8 2 17-5 25-13Z" fill="#c7b9e9" stroke="#8576aa" strokeOpacity=".65" strokeWidth="2.4" strokeLinejoin="round"/>
      <path d="M61 80C49 69 40 64 33 64m19 26c-6-4-11-6-17-6" fill="none" stroke="#9d8dc6" strokeOpacity=".6" strokeWidth="2" strokeLinecap="round"/>
    </g>
    <g className="part-wing part-wing-right">
      <path d="M92 77c16-19 32-29 41-26 6 2 3 11-4 17 10-1 14 3 11 9-3 6-11 8-19 6 5 9 2 16-5 18-8 2-17-5-25-13Z" fill="#c7b9e9" stroke="#8576aa" strokeOpacity=".65" strokeWidth="2.4" strokeLinejoin="round"/>
      <path d="M99 80c12-11 21-16 28-16m-19 26c6-4 11-6 17-6" fill="none" stroke="#9d8dc6" strokeOpacity=".6" strokeWidth="2" strokeLinecap="round"/>
    </g>
    <g className="dragon-body-part part-body">
      <path d="M57 81c-7 7-11 19-11 31 0 20 14 33 35 33s36-13 36-32c0-13-5-25-14-33-7-6-14-8-23-7-10 0-17 3-23 8Z" fill="#a998d6" stroke="#8073a4" strokeOpacity=".7" strokeWidth="2.5" strokeLinejoin="round"/>
      <path d="M71 101c7-5 17-6 25-2 8 5 12 16 9 27-3 8-10 13-19 14-10 1-18-3-22-11-4-9-2-21 7-28Z" fill="#eee7f6" opacity=".95"/>
      <path d="M59 124c-4 8-2 15 5 18 7 2 13-2 16-8m14-1c4 7 11 10 17 7 5-3 6-10 2-16" fill="#aa97d8" stroke="#8073a4" strokeOpacity=".65" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M68 135c-7 9-8 15-2 17 6 2 15 0 21-5 5 5 14 7 20 5 6-2 5-8-2-17" fill="#eee7f6" stroke="#8073a4" strokeOpacity=".6" strokeWidth="2.2" strokeLinejoin="round"/>
      <path d="M71 107c-4 4-6 9-5 14m29-14c4 4 6 9 5 14" fill="none" stroke="#fff" strokeOpacity=".62" strokeWidth="2.4" strokeLinecap="round"/>
    </g>
    <g className="dragon-neck-part">
      <path d="M61 81c0-14 8-23 19-23 13 0 21 10 20 27l-5 15c-8-6-19-7-28-2Z" fill="#aa99d7"/>
      <path d="M71 81c5-3 13-3 18 0" fill="none" stroke="#c9bde5" strokeWidth="2.4" strokeLinecap="round"/>
    </g>
    <g className="part-head">
      <path d="M65 43c-7-3-9-9-6-16 7 2 11 6 14 12m12 4c7-3 9-9 6-16-7 2-11 6-14 12" fill="#a392d0" stroke="#8073a4" strokeOpacity=".7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M66 35c4 2 7 5 9 9m13-9c-4 2-7 5-9 9" fill="none" stroke="#cfc4e7" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M48 63c0-20 12-32 32-32s32 12 32 32c0 19-12 31-32 31S48 82 48 63Z" fill="#b5a5dd" stroke="#8073a4" strokeOpacity=".72" strokeWidth="2.5"/>
      <path d="M55 54c4-11 13-17 24-18" fill="none" stroke="#e0d8f1" strokeWidth="2.8" strokeLinecap="round" opacity=".8"/>
      <g className="dragon-eyes mascot-eyes">
        <ellipse cx="66" cy="63" rx="4.6" ry="6.4" fill="#443d56"/><ellipse cx="94" cy="63" rx="4.6" ry="6.4" fill="#443d56"/>
        <circle cx="67.5" cy="61" r="1.7" fill="#fff"/><circle cx="95.5" cy="61" r="1.7" fill="#fff"/>
      </g>
      <path d="M74 75q6-4 12 0-3 5-6 5t-6-5Z" fill="#806b99"/>
      <path d="M70 84c3 3 6 4 10 4s7-1 10-4" fill="none" stroke="#826e98" strokeWidth="2" strokeLinecap="round"/>
      {accessory === "glasses" && <g className="mascot-accessory-svg" fill="none" stroke="#697c82" strokeWidth="2"><circle cx="66" cy="64" r="9"/><circle cx="94" cy="64" r="9"/><path d="M75 64h10m-28 0-7-2m53 2 8-2"/></g>}
      {accessory === "star" && <path className="mascot-accessory-svg" d="m111 44 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="#f0cc78"/>}
    </g>
    {accessory === "scarf" && <g className="mascot-accessory-svg"><path d="M58 91c11 8 34 10 45 0l-2 9c-12 9-31 8-43 0Z" fill="#d88f9b"/><path d="m82 97 10 2-2 18-8-2Z" fill="#e8a7aa"/></g>}
    {accessory === "halo" && <ellipse className="mascot-accessory-svg" cx="80" cy="18" rx="20" ry="5.5" fill="none" stroke="#d5b260" strokeWidth="2.4"/>}
  </svg>;

  if (species === "robot") return <svg viewBox="7 7 146 146" className="mascot-illustration" aria-hidden="true">
    <ellipse cx="80" cy="138" rx="44" ry="8" fill="#31574f" opacity=".13"/><g className="part-arm"><path d="M51 101c-9-6-20-2-21 8-1 7 4 13 11 13 6 0 11-4 16-9" fill="none" stroke="#4f9a8a" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round"/><path d="M109 101c9-6 20-2 21 8 1 7-4 13-11 13-6 0-11-4-16-9" fill="none" stroke="#4f9a8a" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round"/></g><path className="part-body" d="M50 123q-5-22 6-32h48q11 10 6 32-15 11-30 8-15 3-30-8Z" fill="#81cabc" stroke="#699589" strokeWidth="2.4"/><path d="M61 116h38" stroke="#e9f9f4" strokeWidth="5" strokeLinecap="round"/><path d="M80 37V26m0 0q-8-7 0-12 9 5 0 12Z" fill="#e7a85c" stroke="#72998f" strokeWidth="2.4"/><g className="part-head"><rect x="39" y="34" width="82" height="70" rx="22" fill="#b9e6dc" stroke="#699589" strokeWidth="2.8"/><path d="M49 41 43 34m68 7 6-7" fill="none" stroke="#70b9aa" strokeWidth="5" strokeLinecap="round"/><rect x="48" y="49" width="64" height="37" rx="13" fill="#355c61"/><g className="mascot-eyes"><ellipse cx="65" cy="67" rx="5" ry="7" fill="#a5f1e1"/><ellipse cx="95" cy="67" rx="5" ry="7" fill="#a5f1e1"/><circle cx="66" cy="65" r="2" fill="white"/><circle cx="96" cy="65" r="2" fill="white"/><path d="M73 77h14" stroke="#a5f1e1" strokeWidth="2.4" strokeLinecap="round"/></g><circle cx="48" cy="95" r="3" fill="#e6b556"/><circle cx="112" cy="95" r="3" fill="#e6b556"/>{glasses}{pin}</g>{scarf}{halo}
  </svg>;

  if (species === "spirit") return <svg viewBox="7 7 146 146" className="mascot-illustration" aria-hidden="true">
    <ellipse cx="80" cy="139" rx="38" ry="7" fill="#5983a1" opacity=".1"/><path className="part-tail" d="M51 117q-13 17-18 1m75-1q13 17 18 1" fill="none" stroke="#8fc4df" strokeWidth="7" strokeLinecap="round"/><path className="part-body" d="M80 34q39 0 42 38v32q-3 27-42 33-39-6-42-33V72q3-38 42-38Z" fill="#eaf8ff" stroke="#83b7d2" strokeWidth="2.4"/><path className="part-arm" d="M46 91q-15 4-14 17 2 10 15 6m67-23q15 4 14 17-2 10-15 6" fill="none" stroke="#83b7d2" strokeWidth="7" strokeLinecap="round"/>{eye}<path d="M67 95q13 7 26 0" fill="none" stroke="#9bb7cc" strokeWidth="2" strokeLinecap="round"/><circle cx="49" cy="50" r="4" fill="#fff"/><circle cx="117" cy="62" r="3" fill="#fff"/>{pin}{halo}
  </svg>;

  if (species === "bird") return <svg viewBox="7 7 146 146" className="mascot-illustration" aria-hidden="true">
    <ellipse cx="80" cy="138" rx="38" ry="8" fill="#844c5b" opacity=".11"/><path className="part-wing" d="M54 90q-23 2-25 25 18 7 31-4m46-21q23 2 25 25-18 7-31-4" fill="#f3a7b8" stroke="#b67d8d" strokeWidth="2.4"/><path className="part-tail" d="M103 108c9-7 17-12 25-15 0 11-2 19-8 26-5 2-11 2-17 1Z" fill="#dc8eaa" stroke="#b67d8d" strokeWidth="2.4"/><path className="part-body" d="M48 126q-9-20-4-45 8-34 36-35 28 1 36 35 5 25-4 45-15 10-32 8-17 2-32-8Z" fill="#ffd5df" stroke="#b67d8d" strokeWidth="2.4"/><path d="m69 39 11-15 11 15" fill="#f1bd59" stroke="#b67d8d" strokeWidth="2"/>{eye}<path d="m73 83 7 8 7-8Z" fill="#e6a64f"/><path d="M62 125q-6 4-9 9m45-9q6 4 9 9" fill="none" stroke="#e6a64f" strokeWidth="2.8" strokeLinecap="round"/>{pin}{halo}
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
