import type { CustomizationSettings, ThemeId } from "@/src/types/customization";

export type Palette = { accent: string; paper: string; surface: string; ink: string; muted: string; line: string };
type AppearanceSettings = Pick<CustomizationSettings, "theme" | "systemTheme" | "cardRadius" | "shadowIntensity" | "animationIntensity" | "visualStyle" | "accentMode" | "accent" | "background" | "customWallpaperId" | "wallpaperBlur" | "wallpaperDim" | "wallpaperScale" | "wallpaperX" | "wallpaperY" | "customBackground" | "fontScale" | "density" | "largeText" | "animations">;

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
      systemTheme: value.systemTheme === true,
      // Keep persisted preferences from v1/v2 recognizable while softening their treatment.
      visualStyle: storedVisualStyle === "soft-brutalism-lite" || storedVisualStyle === "neo-brutalist"
        ? "soft-brutalism-lite"
        : storedVisualStyle === "calm" ? "calm" : defaults.visualStyle,
      accentMode: value.accentMode === "custom" || (value.accentMode === undefined && isColor(value.accent) && value.accent.toLowerCase() !== defaults.accent) ? "custom" : "theme",
      accent: isColor(value.accent) ? value.accent : defaults.accent,
      background: ["quiet", "stars", "library", "sakura", "forest", "ocean", "gradient", "dots", "grid", "paper", "abstract", "image", "custom"].includes(value.background ?? "") ? value.background! : defaults.background,
      customWallpaperId: typeof value.customWallpaperId === "string" && /^[a-zA-Z0-9-]{1,64}$/.test(value.customWallpaperId) ? value.customWallpaperId : defaults.customWallpaperId,
      wallpaperBlur: typeof value.wallpaperBlur === "number" && Number.isFinite(value.wallpaperBlur) ? Math.min(12, Math.max(0, value.wallpaperBlur)) : defaults.wallpaperBlur,
      wallpaperDim: typeof value.wallpaperDim === "number" && Number.isFinite(value.wallpaperDim) ? Math.min(0.45, Math.max(0, value.wallpaperDim)) : defaults.wallpaperDim,
      wallpaperScale: typeof value.wallpaperScale === "number" && Number.isFinite(value.wallpaperScale) ? Math.min(1.6, Math.max(0.8, value.wallpaperScale)) : defaults.wallpaperScale,
      wallpaperX: typeof value.wallpaperX === "number" && Number.isFinite(value.wallpaperX) ? Math.min(100, Math.max(0, value.wallpaperX)) : defaults.wallpaperX,
      wallpaperY: typeof value.wallpaperY === "number" && Number.isFinite(value.wallpaperY) ? Math.min(100, Math.max(0, value.wallpaperY)) : defaults.wallpaperY,
      customBackground: isColor(value.customBackground) ? value.customBackground : defaults.customBackground,
      cardRadius: typeof value.cardRadius === "number" && Number.isFinite(value.cardRadius) ? Math.min(24, Math.max(8, value.cardRadius)) : defaults.cardRadius,
      shadowIntensity: typeof value.shadowIntensity === "number" && Number.isFinite(value.shadowIntensity) ? Math.min(1.5, Math.max(0, value.shadowIntensity)) : defaults.shadowIntensity,
      animationIntensity: typeof value.animationIntensity === "number" && Number.isFinite(value.animationIntensity) ? Math.min(1.5, Math.max(0.5, value.animationIntensity)) : defaults.animationIntensity,
      fontScale: typeof value.fontScale === "number" && Number.isFinite(value.fontScale) ? Math.min(2, Math.max(0.9, Math.round(value.fontScale * 10) / 10)) : defaults.fontScale,
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
    const effectiveTheme: ThemeId = settings.systemTheme && typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : settings.systemTheme ? (settings.theme === "dark" ? "lavender" : settings.theme) : settings.theme;
    const palette = palettes[effectiveTheme];
    const requested = settings.accentMode === "custom" ? settings.accent : palette.accent;
    const soft = mixColor(requested, palette.surface, 0.12);
    const target = effectiveTheme === "dark" ? "#ffffff" : "#000000";
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
      "--shadow-color": effectiveTheme === "dark" ? "rgba(0, 0, 0, 0.28)" : "color-mix(in srgb, " + accent + " 10%, transparent)",
      "--studio-radius": settings.cardRadius + "px",
      "--studio-shadow": "0 16px 46px rgba(35, 26, 57, " + (settings.shadowIntensity * 0.1) + ")",
      "--mascot-motion-scale": String(settings.animationIntensity),
      "--wallpaper-blur": settings.wallpaperBlur + "px",
      "--wallpaper-dim": String(settings.wallpaperDim),
      "--wallpaper-scale": String(settings.wallpaperScale),
      "--wallpaper-x": settings.wallpaperX + "%",
      "--wallpaper-y": settings.wallpaperY + "%",
      "--font-scale": String(settings.fontScale),
      "--content-space": compact ? "12px" : "18px",
      "--section-gap": compact ? "12px" : "20px",
      "--item-gap": compact ? "6px" : "9px",
    };
  }
  function apply(root: HTMLElement, input: unknown) {
    const settings = normalize(input);
    const effectiveTheme: ThemeId = settings.systemTheme && typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : settings.systemTheme ? (settings.theme === "dark" ? "lavender" : settings.theme) : settings.theme;
    root.dataset.theme = effectiveTheme;
    root.dataset.themeMode = settings.systemTheme ? "system" : "manual";
    root.dataset.visualStyle = settings.visualStyle;
    root.dataset.background = settings.background;
    root.dataset.density = settings.density;
    root.dataset.largeText = String(settings.largeText);
    root.dataset.reduceMotion = String(!settings.animations);
    root.dataset.motionIntensity = settings.animationIntensity < 0.9 ? "low" : settings.animationIntensity > 1.1 ? "high" : "normal";
    Object.entries(style(settings)).forEach(([key, value]) => root.style.setProperty(key, value));
  }
  return { normalize, style, apply };
}
