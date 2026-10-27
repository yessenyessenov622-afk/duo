import { createAppearanceRuntime } from "@/src/lib/appearance-runtime";
import { PALETTES } from "@/src/lib/appearance-palette";
import type { CustomizationSettings, ThemeId } from "@/src/types/customization";

export const SETTINGS_KEY = "kiraquest.customization.v1";
export const DEFAULT_SETTINGS: CustomizationSettings = {
  version: 3, visualStyle: "soft-brutalism-lite", theme: "lavender", lastLightTheme: "lavender", accentMode: "theme",
  accent: "#8064d8", background: "quiet", customBackground: "#f4f0fb",
  fontScale: 1, density: "comfortable", mascot: { id: "miko", accessory: "none" },
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
    version: 3,
    lastLightTheme: theme !== "dark" ? theme : lastLightTheme,
    mascot: {
      id: typeof mascot.id === "string" && /^[a-z0-9-]+$/.test(mascot.id) ? mascot.id : "miko",
      accessory: accessories.includes(mascot.accessory) ? mascot.accessory : "none",
    },
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
