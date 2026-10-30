import type { ReactNode, SVGProps } from "react";

export type AppIconName = "home" | "map" | "lessons" | "mascots" | "studio" | "profile" | "reviews" | "admin";

const paths: Record<AppIconName, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></>,
  map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" /><path d="M9 3v15m6-12v15" /></>,
  lessons: <><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 4.5v17M8 6h8m-8 4h8" /></>,
  mascots: <><circle cx="12" cy="12" r="9" /><path d="M8.5 10h.01M15.5 10h.01M8.5 14c1.8 2 5.2 2 7 0" /><path d="m5 5-2-2m16 2 2-2" /></>,
  studio: <><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1" /><circle cx="12" cy="12" r="4" /></>,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  reviews: <><path d="M4 4h16v12H9l-5 4z" /><path d="M8 8h8M8 12h6" /></>,
  admin: <><path d="M12 2 4 5v6c0 5 3 8 8 11 5-3 8-6 8-11V5z" /><path d="m9 12 2 2 4-4" /></>,
};

export function AppIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: AppIconName }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{paths[name]}</svg>;
}
