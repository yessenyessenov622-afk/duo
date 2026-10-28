import { createAppearanceRuntime } from "@/src/lib/appearance-runtime";
import { PALETTES } from "@/src/lib/appearance-palette";
import type { CustomizationSettings, MascotLook, ThemeId } from "@/src/types/customization";
import { mascotPreviews } from "@/src/data/mascots";

export const SETTINGS_KEY = "kiraquest.customization.v1";
const SETTINGS_VERSION = 7;
export const DEFAULT_SETTINGS: CustomizationSettings = {
  version: SETTINGS_VERSION, visualStyle: "soft-brutalism-lite", theme: "lavender", themeMode: "light", cardRadius: 16, shadowIntensity: 0.65, animationIntensity: 1, accentMode: "theme",
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
  return {
    ...appearance,
    version: SETTINGS_VERSION,
    cardRadius: typeof value.cardRadius === "number" && Number.isFinite(value.cardRadius) ? Math.min(24, Math.max(8, value.cardRadius)) : DEFAULT_SETTINGS.cardRadius,
    shadowIntensity: typeof value.shadowIntensity === "number" && Number.isFinite(value.shadowIntensity) ? Math.min(1.5, Math.max(0, value.shadowIntensity)) : DEFAULT_SETTINGS.shadowIntensity,
    animationIntensity: typeof value.animationIntensity === "number" && Number.isFinite(value.animationIntensity) ? Math.min(1.5, Math.max(0.5, value.animationIntensity)) : DEFAULT_SETTINGS.animationIntensity,
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
    const source = parsed as Record<string, unknown>;
    const settings = normalizeSettings(source);
    const invalid = hasInvalidStoredSettings(source);
    if (invalid) return { settings, warning: "Некорректные настройки заменены допустимыми значениями. Проверь тему, фон и параметры маскота в студии." };

    // v3 stored one accessory on the selected mascot. v6 keeps a look per mascot;
    // normalizeSettings carries that accessory forward and initializes other looks.
    const storedMascot = source.mascot && typeof source.mascot === "object" ? source.mascot as Record<string, unknown> : {};
    const storedLooks = storedMascot.looks && typeof storedMascot.looks === "object" ? storedMascot.looks as Record<string, unknown> : {};
    const hasAllMascotLooks = mascotPreviews.every((entry) => {
      const look = storedLooks[entry.id];
      return !!look && typeof look === "object" && "accessory" in look && "pose" in look;
    });
    const needsMigration = source.version !== SETTINGS_VERSION || !hasAllMascotLooks;
    if (needsMigration && !writeSettings(settings)) {
      return { settings, warning: "Настройки перенесены для этой страницы, но браузер не сохранил новый формат. Разреши локальное хранилище, чтобы миграция сохранилась." };
    }
    return { settings, warning: "" };
  } catch {
    return { settings: DEFAULT_SETTINGS, warning: "Сохранённое оформление повреждено. Включены исходные настройки; следующее сохранение заменит повреждённые данные." };
  }
}

function hasInvalidStoredSettings(source: Record<string, unknown>): boolean {
  const present = (key: string) => Object.prototype.hasOwnProperty.call(source, key);
  const invalid = (key: string, test: (value: unknown) => boolean) => present(key) && !test(source[key]);
  const color = (value: unknown) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
  const boundedNumber = (key: string, min: number, max: number) => invalid(key, (value) => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max);
  if (invalid("version", (value) => typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= SETTINGS_VERSION)) return true;
  if (invalid("theme", (value) => typeof value === "string" && themes.includes(value as ThemeId))) return true;
  if (invalid("lastLightTheme", (value) => typeof value === "string" && themes.includes(value as ThemeId) && value !== "dark")) return true;
  if (invalid("themeMode", (value) => value === "light" || value === "dark" || value === "system")) return true;
  if (invalid("visualStyle", (value) => value === "calm" || value === "soft-brutalism-lite" || value === "neo-brutalist" || value === "retro-desktop")) return true;
  if (invalid("accentMode", (value) => value === "theme" || value === "custom")) return true;
  if (invalid("accent", color) || invalid("customBackground", color)) return true;
  if (invalid("background", (value) => typeof value === "string" && ["quiet", "stars", "library", "sakura", "forest", "ocean", "gradient", "dots", "grid", "paper", "abstract", "image", "custom"].includes(value))) return true;
  if (invalid("customWallpaperId", (value) => typeof value === "string" && /^[a-zA-Z0-9-]{1,64}$/.test(value))) return true;
  if (boundedNumber("cardRadius", 8, 24) || boundedNumber("shadowIntensity", 0, 1.5) || boundedNumber("animationIntensity", 0.5, 1.5) || boundedNumber("wallpaperBlur", 0, 12) || boundedNumber("wallpaperDim", 0, 0.45) || boundedNumber("wallpaperScale", 0.8, 1.6) || boundedNumber("wallpaperX", 0, 100) || boundedNumber("wallpaperY", 0, 100) || boundedNumber("fontScale", 0.9, 2)) return true;
  if (invalid("density", (value) => value === "compact" || value === "comfortable")) return true;
  if (["systemTheme", "animations", "sounds", "largeText"].some((key) => invalid(key, (value) => typeof value === "boolean"))) return true;
  if (invalid("quoteFrequency", (value) => value === "often" || value === "sometimes" || value === "minimal")) return true;

  if (present("mascot")) {
    const mascot = source.mascot;
    if (!mascot || typeof mascot !== "object" || Array.isArray(mascot)) return true;
    const value = mascot as Record<string, unknown>;
    if ("id" in value && (typeof value.id !== "string" || !mascotPreviews.some((entry) => entry.id === value.id))) return true;
    if ("accessory" in value && !accessories.includes(String(value.accessory))) return true;
    if ("looks" in value) {
      if (!value.looks || typeof value.looks !== "object" || Array.isArray(value.looks)) return true;
      for (const [id, look] of Object.entries(value.looks)) {
        if (!mascotPreviews.some((entry) => entry.id === id) || !look || typeof look !== "object" || Array.isArray(look)) return true;
        const item = look as Record<string, unknown>;
        if (("accessory" in item && !accessories.includes(String(item.accessory))) || ("pose" in item && item.pose !== "calm" && item.pose !== "curious")) return true;
      }
    }
  }
  return false;
}

export function writeSettings(settings: CustomizationSettings): boolean {
  try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); return true; }
  catch { return false; }
}
