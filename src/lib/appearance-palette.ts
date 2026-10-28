import type { ThemeId } from "@/src/types/customization";
import type { Palette } from "@/src/lib/appearance-runtime";

const light = { surface: "#ffffff", ink: "#272733", muted: "#686471", line: "#e4dfeb" };
export const PALETTES: Record<ThemeId, Palette> = {
  light: { ...light, accent: "#7052bd", paper: "#f8f7f4" },
  lavender: { ...light, accent: "#8064d8", paper: "#f6f2fc" },
  amber: { ...light, accent: "#b7792b", paper: "#fbf4e8" },
  mint: { ...light, accent: "#3f8a79", paper: "#edf8f3" },
  sakura: { ...light, accent: "#bd6584", paper: "#fcf0f4" },
  ocean: { ...light, accent: "#467da0", paper: "#eef6fb", dark: { paper: "#111e2b", surface: "#1d3141", ink: "#eef8ff", muted: "#b6ccda", line: "#405b6c" } },
  forest: { ...light, accent: "#687f50", paper: "#f0f5ea", dark: { paper: "#151f19", surface: "#23332a", ink: "#edf8ef", muted: "#b8cdbc", line: "#455e4c" } },
  mono: { ...light, accent: "#55515f", paper: "#f2f2f3" },
  dark: { accent: "#b4a0f5", paper: "#17161d", surface: "#23212b", ink: "#f1eff6", muted: "#b9b4c1", line: "#3b3846" },
  "dark-knight": { accent: "#7054b9", paper: "#f1eef9", surface: "#ffffff", ink: "#272334", muted: "#665f74", line: "#ddd7ed", dark: { paper: "#171421", surface: "#252033", ink: "#f5f1ff", muted: "#c6bed5", line: "#514861" } },
  cyberpunk: { accent: "#b63082", paper: "#fff0fb", surface: "#fffaff", ink: "#30213c", muted: "#6f5a71", line: "#e8cce4", dark: { paper: "#171124", surface: "#292039", ink: "#fff1fc", muted: "#d0b7cf", line: "#654260" } },
  sunset: { accent: "#aa512d", paper: "#fff3e9", surface: "#fffaf5", ink: "#382923", muted: "#715c53", line: "#eddbcb", dark: { paper: "#231819", surface: "#382527", ink: "#fff1e7", muted: "#d7bdb4", line: "#6a4b48" } },
  "royal-purple": { accent: "#7050bc", paper: "#f5efff", surface: "#fffaff", ink: "#2c233b", muted: "#6c607a", line: "#e1d5f2", dark: { paper: "#191325", surface: "#2b213b", ink: "#f9f2ff", muted: "#cbbddd", line: "#57476c" } },
};
