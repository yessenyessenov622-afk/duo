"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_SETTINGS, appearanceRuntime, normalizeSettings } from "@/src/lib/customization";
import { useAccount } from "@/src/components/AccountProvider";
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
  const account = useAccount();
  const settings = account.data.settings;
  const ready = account.ready;
  const [warning, setWarning] = useState("");
  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    appearanceRuntime.apply(root, settings);
    const systemTheme = window.matchMedia?.("(prefers-color-scheme: dark)");
    const applySystemTheme = () => appearanceRuntime.apply(root, settings);
    if (settings.themeMode === "system") systemTheme?.addEventListener("change", applySystemTheme);
    root.style.removeProperty("--wallpaper-image");
    let active = true;
    let imageUrl = "";
    if (settings.background === "image") {
      const wallpaper = account.user
        ? fetch(`/api/account/wallpaper?v=${account.data.revision}`, { credentials: "same-origin", cache: "no-store", headers: { "X-Kiraquest-Account": account.user.id } }).then((r) => { if (!r.ok) throw new Error("wallpaper_unavailable"); return r.blob(); })
        : loadWallpaper(settings.customWallpaperId);
      wallpaper.then((blob) => {
        if (!active || !blob) return;
        imageUrl = URL.createObjectURL(blob);
        root.style.setProperty("--wallpaper-image", `url("${imageUrl}")`);
      }).catch(() => setWarning("Не удалось загрузить сохранённый фон. Выбери другое изображение в студии."));
    }
    return () => {
      active = false;
      if (settings.themeMode === "system") systemTheme?.removeEventListener("change", applySystemTheme);
      root.style.removeProperty("--wallpaper-image");
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [settings, ready, account.user, account.data.revision]);
  const save = useCallback((next: CustomizationSettings) => {
    const normalized = normalizeSettings(next);
    if (!account.update({ settings: normalized })) {
      setWarning("Не удалось принять изменения оформления. Проверь состояние аккаунта или доступ к гостевому хранилищу.");
      return false;
    }
    setWarning("");
    return true;
  }, [account.update]);
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
