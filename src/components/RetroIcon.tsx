import type { SVGProps } from "react";
import type { AppIconName } from "@/src/components/AppIcon";

const icons: Record<AppIconName, string> = {
  home: "M3 11h3V8h3V5h6v3h3v3h3v10h-7v-6h-4v6H3z",
  map: "M3 5h6v14H3zM9 7h6v14H9zM15 4h6v14h-6z",
  lessons: "M4 3h16v18H4zM7 7h10M7 11h10M7 15h7",
  mascots: "M6 5h12v3h3v9h-3v3H6v-3H3V8h3zM8 10h2v2H8zM14 10h2v2h-2zM9 15h6",
  studio: "M4 4h6v4H4zM14 4h6v4h-6zM4 10h6v4H4zM14 10h6v4h-6zM4 16h6v4H4zM14 16h6v4h-6z",
  profile: "M9 3h6v2h3v6h-3v2H9v-2H6V5h3zM4 16h3v-2h10v2h3v5H4z",
  reviews: "M3 3h18v14H9l-6 4zM6 7h12v2H6zM6 11h9v2H6z",
  admin: "M5 3h14v3h2v7h-2v3h-2v3h-3v2h-4v-2H7v-3H5v-3H3V6h2z",
};

export function RetroIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: AppIconName }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true" focusable="false" {...props}><path d={icons[name]} fillRule="evenodd" /></svg>;
}
