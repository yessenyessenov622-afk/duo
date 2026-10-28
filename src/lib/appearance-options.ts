import type { PaletteId, VisualStyleId } from "@/src/types/customization";

export const QUICK_THEMES: { id: PaletteId; label: string; color: string }[] = [
  { id: "dark-knight", label: "Dark Knight", color: "#7054b9" },
  { id: "cyberpunk", label: "Cyberpunk", color: "#c13c93" },
  { id: "ocean", label: "Ocean", color: "#467da0" },
  { id: "forest", label: "Forest", color: "#687f50" },
  { id: "sunset", label: "Sunset", color: "#c16b43" },
  { id: "royal-purple", label: "Royal Purple", color: "#8064d8" },
];
export const VISUAL_STYLES: { id: VisualStyleId; label: string; description: string }[] = [
  { id: "calm", label: "Modern KiraQuest", description: "Мягкие карточки и спокойные детали" },
  { id: "retro-desktop", label: "Retro OS / Windows 95", description: "Окна и объёмные кнопки" },
  { id: "pixel-art", label: "Pixel Art / 8-Bit", description: "Пиксельные рамки и игровой маршрут" },
  { id: "y2k", label: "Y2K / Retro Internet", description: "Глянец, хром и градиенты" },
  { id: "arcade", label: "Retro Arcade", description: "Неоновые панели и игровые счётчики" },
  { id: "soft-brutalism-lite", label: "Необрутализм", description: "Чёткие границы и выразительные тени" },
];
