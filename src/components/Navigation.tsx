"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavigationItem } from "@/src/types/navigation";
import { AppIcon, type AppIconName } from "@/src/components/AppIcon";

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

  return (
    <nav className="side-nav" aria-label="Разделы KiraQuest">
      {navigationItems.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            className={`nav-item nav-link${isActive ? " active" : ""}`}
            href={item.href}
            key={item.href}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="nav-icon"><AppIcon name={item.icon} /></span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
