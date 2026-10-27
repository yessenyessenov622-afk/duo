import type { CustomizationSettings, ThemeId } from "@/src/types/customization";

export type Palette = { accent: string; paper: string; surface: string; ink: string; muted: string; line: string };
type AppearanceSettings = Pick<CustomizationSettings, "theme" | "visualStyle" | "accentMode" | "accent" | "background" | "customBackground" | "fontScale" | "density" | "largeText" | "animations">;

// Keep this factory self-contained: its compiled source also runs before React.
// All runtime dependencies must be local declarations or explicit arguments so
// production minification cannot break the serialized bootstrap.
export function createAppearanceRuntime(palettes: Record<ThemeId, Palette>, defaults: AppearanceSettings) {
  function normalize(input: unknown): AppearanceSettings {
    const value = input && typeof input === "object" && !Array.isArray(input) ? input as Partial<AppearanceSettings> : {};
    const storedVisualStyle = input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>).visualStyle
      : undefined;
    const isColor = (color: unknown): color is string => typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color);
    return {
      theme: typeof value.theme === "string" && Object.prototype.hasOwnProperty.call(palettes, value.theme) ? value.theme : defaults.theme,
      // Keep persisted preferences from v1/v2 recognizable while softening their treatment.
      visualStyle: storedVisualStyle === "soft-brutalism-lite" || storedVisualStyle === "neo-brutalist"
        ? "soft-brutalism-lite"
        : storedVisualStyle === "calm" ? "calm" : defaults.visualStyle,
      accentMode: value.accentMode === "custom" || (value.accentMode === undefined && isColor(value.accent) && value.accent.toLowerCase() !== defaults.accent) ? "custom" : "theme",
      accent: isColor(value.accent) ? value.accent : defaults.accent,
      background: ["quiet", "stars", "library", "sakura", "forest", "ocean", "custom"].includes(value.background ?? "") ? value.background! : defaults.background,
      customBackground: isColor(value.customBackground) ? value.customBackground : defaults.customBackground,
      fontScale: typeof value.fontScale === "number" && Number.isFinite(value.fontScale) ? Math.min(1.2, Math.max(0.9, Math.round(value.fontScale * 10) / 10)) : defaults.fontScale,
      density: value.density === "compact" ? "compact" : "comfortable",
      animations: typeof value.animations === "boolean" ? value.animations : defaults.animations,
      largeText: typeof value.largeText === "boolean" ? value.largeText : defaults.largeText,
    };
  }
  function rgb(hex: string) { return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)); }
  function mixColor(foreground: string, background: string, weight: number): string {
    const back = rgb(background);
    return "#" + rgb(foreground).map((channel, i) => Math.round(channel * weight + back[i] * (1 - weight)).toString(16).padStart(2, "0")).join("");
  }
  function luminance(color: string): number {
    const channels = rgb(color).map((c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }
  function contrastRatio(a: string, b: string): number {
    const x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  function style(input: unknown): Record<string, string> {
    const settings = normalize(input);
    const palette = palettes[settings.theme];
    const requested = settings.accentMode === "custom" ? settings.accent : palette.accent;
    const soft = mixColor(requested, palette.surface, 0.12);
    const target = settings.theme === "dark" ? "#ffffff" : "#000000";
    let accent = requested;
    for (let i = 0; i <= 100; i++) {
      accent = mixColor(target, requested, i / 100);
      if ([palette.paper, palette.surface, soft].every((background) => contrastRatio(accent, background) >= 4.5)) break;
    }
    const onAccent = contrastRatio(accent, "#ffffff") >= 4.5 ? "#ffffff" : "#000000";
    const compact = settings.density === "compact";
    return {
      "--paper": palette.paper, "--surface": palette.surface, "--ink": palette.ink,
      "--muted": palette.muted, "--line": palette.line,
      "--accent": accent, "--accent-soft": soft, "--on-accent": onAccent,
      "--purple": accent, "--purple-dark": accent, "--lavender": soft,
      "--focus-ring": accent, "--custom-wallpaper": settings.customBackground,
      "--border-subtle": palette.line,
      "--shadow-color": settings.theme === "dark" ? "rgba(0, 0, 0, 0.28)" : "color-mix(in srgb, " + accent + " 10%, transparent)",
      "--font-scale": String(settings.fontScale),
      "--content-space": compact ? "12px" : "18px",
      "--section-gap": compact ? "12px" : "20px",
      "--item-gap": compact ? "6px" : "9px",
    };
  }
  function apply(root: HTMLElement, input: unknown) {
    const settings = normalize(input);
    root.dataset.theme = settings.theme;
    root.dataset.visualStyle = settings.visualStyle;
    root.dataset.background = settings.background;
    root.dataset.density = settings.density;
    root.dataset.largeText = String(settings.largeText);
    root.dataset.reduceMotion = String(!settings.animations);
    Object.entries(style(settings)).forEach(([key, value]) => root.style.setProperty(key, value));
  }
  return { normalize, style, apply };
}
