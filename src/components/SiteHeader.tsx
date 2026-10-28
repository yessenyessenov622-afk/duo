"use client";

import { usePathname } from "next/navigation";
import { useCustomization } from "@/src/components/CustomizationProvider";
import type { NavigationItem } from "@/src/types/navigation";
import { FocusInterval } from "@/src/components/FocusInterval";
import { AccountStatus } from "@/src/components/AccountBoundary";

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
  const toggleTheme = () => save({ ...settings, themeMode: settings.themeMode === "dark" ? "light" : "dark" });
  const pageName = settings.visualStyle === "retro-desktop"
    ? pathname === "/lessons" ? "Библиотека курсов" : pathname === "/profile" ? "Карточка ученика" : pathname === "/studio" ? "Панель оформления" : pageNames.find((page) => page.href === pathname)?.label ?? "KiraQuest"
    : pageNames.find((page) => page.href === pathname)?.label ?? "KiraQuest";

  return (
    <>
    <header className="topbar">
      <div className="breadcrumb">
        Моё пространство <span>/</span> {pageName}
      </div>
      <div className="top-actions">
        <FocusInterval />
        <button type="button" className="theme-toggle" disabled={!ready} onClick={toggleTheme} aria-pressed={settings.themeMode === "dark"} aria-label={settings.themeMode === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}><span aria-hidden="true">{settings.themeMode === "dark" ? "☀" : "☾"}</span></button>
        <AccountStatus />
      </div>
    </header>
    {warning && <div className="settings-warning" role="status"><p>{warning}</p><button type="button" aria-label="Закрыть сообщение о настройках" onClick={dismissWarning}>×</button></div>}
    </>
  );
}
