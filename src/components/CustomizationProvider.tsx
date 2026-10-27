"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_SETTINGS, appearanceRuntime, normalizeSettings, readSettings, writeSettings } from "@/src/lib/customization";
import { loadWallpaper } from "@/src/lib/wallpaper-storage";
import type { CustomizationSettings } from "@/src/types/customization";

type CustomizationContextValue = {
  settings: CustomizationSettings;
  ready: boolean;
  warning: string;
  dismissWarning: () => void;
  save: (settings: CustomizationSettings) => boolean;
  reset: () => boolean;
};
const CustomizationContext = createContext<CustomizationContextValue | null>(null);

export function CustomizationProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState("");
  useEffect(() => {
    const stored = readSettings();
    setSettings(stored.settings);
    setWarning(stored.warning);
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    appearanceRuntime.apply(root, settings);
    root.style.removeProperty("--wallpaper-image");
    let active = true;
    let imageUrl = "";
    if (settings.background === "image") {
      loadWallpaper(settings.customWallpaperId).then((blob) => {
        if (!active || !blob) return;
        imageUrl = URL.createObjectURL(blob);
        root.style.setProperty("--wallpaper-image", `url("${imageUrl}")`);
      }).catch(() => setWarning("Не удалось загрузить сохранённый фон. Выбери другое изображение в студии."));
    }
    return () => {
      active = false;
      root.style.removeProperty("--wallpaper-image");
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [settings, ready]);
  const save = useCallback((next: CustomizationSettings) => {
    const normalized = normalizeSettings(next);
    if (!writeSettings(normalized)) {
      setWarning("Не удалось сохранить оформление. Браузер запретил запись или хранилище заполнено. Прежние настройки сохранены; разреши хранение данных и повтори попытку.");
      return false;
    }
    setSettings(normalized);
    setWarning("");
    return true;
  }, []);
  const reset = useCallback(() => save(DEFAULT_SETTINGS), [save]);
  const dismissWarning = useCallback(() => setWarning(""), []);
  const value = useMemo(() => ({ settings, ready, warning, dismissWarning, save, reset }), [settings, ready, warning, dismissWarning, save, reset]);
  return <CustomizationContext.Provider value={value}>{children}</CustomizationContext.Provider>;
}

export function useCustomization() {
  const value = useContext(CustomizationContext);
  if (!value) throw new Error("useCustomization must be used inside CustomizationProvider");
  return value;
}
