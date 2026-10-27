import type { ThemeId } from "@/src/types/customization";
import type { Palette } from "@/src/lib/appearance-runtime";

const light = { surface: "#ffffff", ink: "#272733", muted: "#686471", line: "#e4dfeb" };
export const PALETTES: Record<ThemeId, Palette> = {
  light: { ...light, accent: "#7052bd", paper: "#f8f7f4" },
  lavender: { ...light, accent: "#8064d8", paper: "#f6f2fc" },
  amber: { ...light, accent: "#b7792b", paper: "#fbf4e8" },
  mint: { ...light, accent: "#3f8a79", paper: "#edf8f3" },
  sakura: { ...light, accent: "#bd6584", paper: "#fcf0f4" },
  ocean: { ...light, accent: "#467da0", paper: "#eef6fb" },
  forest: { ...light, accent: "#687f50", paper: "#f0f5ea" },
  mono: { ...light, accent: "#55515f", paper: "#f2f2f3" },
  dark: { accent: "#b4a0f5", paper: "#17161d", surface: "#23212b", ink: "#f1eff6", muted: "#b9b4c1", line: "#3b3846" },
};
