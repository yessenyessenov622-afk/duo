import type { CSSProperties } from "react";
import { mascotPreviews } from "@/src/data/mascots";

const accessoryGlyph: Record<string, string> = { star: "✦", glasses: "◉", scarf: "〰", halo: "✧" };

export function MascotAvatar({ id, accessory = "none", className = "", message }: { id: string; accessory?: string; className?: string; message?: string }) {
  const mascot = mascotPreviews.find((entry) => entry.id === id) ?? mascotPreviews[0];
  return (
    <div className={`mascot-avatar ${className}`} style={{ "--mascot-bg": mascot.color } as CSSProperties}>
      <span className="mascot-avatar-glow" aria-hidden="true">✦</span>
      <span className="mascot-avatar-face" aria-hidden="true">{mascot.icon}</span>
      {accessoryGlyph[accessory] && <span className={`mascot-accessory accessory-${accessory}`} aria-label={`Аксессуар: ${accessory}`}>{accessoryGlyph[accessory]}</span>}
      {message && <span className="mascot-speech">{message}</span>}
    </div>
  );
}
