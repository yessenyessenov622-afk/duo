import { createAppearanceRuntime } from "@/src/lib/appearance-runtime";
import { PALETTES } from "@/src/lib/appearance-palette";
import type { CustomizationSettings, MascotLook, ThemeId } from "@/src/types/customization";
import { mascotPreviews } from "@/src/data/mascots";

export const SETTINGS_KEY = "kiraquest.customization.v1";
export const DEFAULT_SETTINGS: CustomizationSettings = {
  version: 6, visualStyle: "soft-brutalism-lite", theme: "lavender", systemTheme: false, cardRadius: 16, shadowIntensity: 0.65, animationIntensity: 1, lastLightTheme: "lavender", accentMode: "theme",
  accent: "#8064d8", background: "quiet", customWallpaperId: "wallpaper-default", wallpaperBlur: 0, wallpaperDim: 0.08, wallpaperScale: 1, wallpaperX: 50, wallpaperY: 50, customBackground: "#f4f0fb",
  fontScale: 1, density: "comfortable", mascot: { id: "ren", accessory: "none", looks: {} },
  animations: true, sounds: false, quoteFrequency: "sometimes", largeText: false,
};

export const appearanceRuntime = createAppearanceRuntime(PALETTES, DEFAULT_SETTINGS);

const themes: ThemeId[] = ["light", "dark", "lavender", "amber", "mint", "sakura", "ocean", "forest", "mono"];
const accessories = ["none", "star", "glasses", "scarf", "halo"];

export function normalizeSettings(input: unknown): CustomizationSettings {
  const value = input && typeof input === "object" && !Array.isArray(input) ? input as Partial<CustomizationSettings> : {};
  const mascot = value.mascot && typeof value.mascot === "object" ? value.mascot : DEFAULT_SETTINGS.mascot;
  const appearance = appearanceRuntime.normalize(input);
  const theme = appearance.theme;
  const lastLightTheme = value.lastLightTheme && themes.filter((id) => id !== "dark").includes(value.lastLightTheme) ? value.lastLightTheme : "lavender";
  return {
    ...appearance,
    version: 6,
    systemTheme: typeof value.systemTheme === "boolean" ? value.systemTheme : false,
    cardRadius: typeof value.cardRadius === "number" && Number.isFinite(value.cardRadius) ? Math.min(24, Math.max(8, value.cardRadius)) : DEFAULT_SETTINGS.cardRadius,
    shadowIntensity: typeof value.shadowIntensity === "number" && Number.isFinite(value.shadowIntensity) ? Math.min(1.5, Math.max(0, value.shadowIntensity)) : DEFAULT_SETTINGS.shadowIntensity,
    animationIntensity: typeof value.animationIntensity === "number" && Number.isFinite(value.animationIntensity) ? Math.min(1.5, Math.max(0.5, value.animationIntensity)) : DEFAULT_SETTINGS.animationIntensity,
    lastLightTheme: theme !== "dark" ? theme : lastLightTheme,
    mascot: (() => {
      const id = typeof mascot.id === "string" && mascotPreviews.some((entry) => entry.id === mascot.id) ? mascot.id : "miko";
      const storedLooks = mascot.looks && typeof mascot.looks === "object" ? mascot.looks as Record<string, unknown> : {};
      const looks = Object.fromEntries(mascotPreviews.map((entry) => {
        const saved = storedLooks[entry.id] && typeof storedLooks[entry.id] === "object" ? storedLooks[entry.id] as Record<string, unknown> : null;
        const legacyAccessory = !mascot.looks && entry.id === id ? mascot.accessory : "none";
        const accessory = saved?.accessory ?? legacyAccessory;
        return [entry.id, { accessory: accessories.includes(String(accessory)) ? String(accessory) : "none", pose: saved?.pose === "curious" ? "curious" : "calm" } as MascotLook];
      })) as Record<string, MascotLook>;
      return { id, accessory: looks[id].accessory, looks };
    })(),
    sounds: typeof value.sounds === "boolean" ? value.sounds : false,
    quoteFrequency: ["often", "sometimes", "minimal"].includes(value.quoteFrequency ?? "") ? value.quoteFrequency! : "sometimes",
  };
}

export function readSettings(): { settings: CustomizationSettings; warning: string } {
  let raw: string | null;
  try { raw = window.localStorage.getItem(SETTINGS_KEY); }
  catch { return { settings: DEFAULT_SETTINGS, warning: "Браузер запретил доступ к настройкам. Разреши локальное хранение, чтобы сохранять оформление." }; }
  if (!raw) return { settings: DEFAULT_SETTINGS, warning: "" };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid settings");
    const settings = normalizeSettings(parsed);
    const invalid = Object.entries(settings).some(([key, value]) => key in parsed && JSON.stringify((parsed as Record<string, unknown>)[key]) !== JSON.stringify(value));
    return { settings, warning: invalid ? "Некорректные настройки заменены допустимыми значениями. Следующее сохранение обновит данные в браузере." : "" };
  } catch {
    return { settings: DEFAULT_SETTINGS, warning: "Сохранённое оформление повреждено. Включены исходные настройки; следующее сохранение заменит повреждённые данные." };
  }
}

export function writeSettings(settings: CustomizationSettings): boolean {
  try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); return true; }
  catch { return false; }
}
