"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavigationItem } from "@/src/types/navigation";
import { AppIcon, type AppIconName } from "@/src/components/AppIcon";
import { RetroIcon } from "@/src/components/RetroIcon";
import { useCustomization } from "@/src/components/CustomizationProvider";

const navigationItems: (NavigationItem & { icon: AppIconName })[] = [
  { href: "/", label: "Обзор", icon: "home" },
  { href: "/map", label: "Карта", icon: "map" },
  { href: "/lessons", label: "Уроки", icon: "lessons" },
  { href: "/mascots", label: "Маскоты", icon: "mascots" },
  { href: "/studio", label: "Студия", icon: "studio" },
  { href: "/profile", label: "Профиль", icon: "profile" },
];

export function Navigation() {
  const pathname = usePathname();
  const { settings } = useCustomization();
  const retro = settings.visualStyle === "retro-desktop";
  const pixelIcons = retro || settings.visualStyle === "pixel-art";

  return (
    <nav className="side-nav" aria-label="Разделы KiraQuest">
      {navigationItems.map((item) => {
        const isActive = pathname === item.href;
        const label = retro
          ? item.href === "/lessons" ? "Библиотека курсов" : item.href === "/profile" ? "Карточка ученика" : item.href === "/studio" ? "Панель оформления" : item.label
          : item.label;

        return (
          <Link
            className={`nav-item nav-link${isActive ? " active" : ""}`}
            href={item.href}
            key={item.href}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="nav-icon">{pixelIcons ? <RetroIcon name={item.icon} /> : <AppIcon name={item.icon} />}</span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
