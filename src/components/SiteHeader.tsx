"use client";

import { usePathname } from "next/navigation";
import { useCustomization } from "@/src/components/CustomizationProvider";
import type { NavigationItem } from "@/src/types/navigation";
import { FocusInterval } from "@/src/components/FocusInterval";

const pageNames: NavigationItem[] = [
  { href: "/", label: "Обзор", icon: "" },
  { href: "/map", label: "Карта обучения", icon: "" },
  { href: "/lessons", label: "Уроки", icon: "" },
  { href: "/mascots", label: "Коллекция маскотов", icon: "" },
  { href: "/studio", label: "Моя студия", icon: "" },
  { href: "/profile", label: "Профиль", icon: "" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { settings, ready, save, warning, dismissWarning } = useCustomization();
  const toggleTheme = () => save({
    ...settings,
    systemTheme: false,
    theme: settings.theme === "dark" ? settings.lastLightTheme : "dark",
    lastLightTheme: settings.theme === "dark" ? settings.lastLightTheme : settings.theme,
  });
  const pageName = pageNames.find((page) => page.href === pathname)?.label ?? "KiraQuest";

  return (
    <>
    <header className="topbar">
      <div className="breadcrumb">
        Моё пространство <span>/</span> {pageName}
      </div>
      <div className="top-actions">
        <FocusInterval />
        <button type="button" className="theme-toggle" disabled={!ready} onClick={toggleTheme} aria-pressed={settings.theme === "dark"} aria-label={settings.theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}><span aria-hidden="true">{settings.theme === "dark" ? "☀" : "☾"}</span></button>
        <div
          className="demo-pill"
          role="status"
          aria-label="Демо-режим: оформление сохраняется в этом браузере, серверной синхронизации нет"
        >
          <span className="demo-dot" />
          <span>ДЕМО</span>
          <small>локальное оформление</small>
        </div>
      </div>
    </header>
    {warning && <div className="settings-warning" role="status"><p>{warning}</p><button type="button" aria-label="Закрыть сообщение о настройках" onClick={dismissWarning}>×</button></div>}
    </>
  );
}
