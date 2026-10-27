"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavigationItem } from "@/src/types/navigation";

const navigationItems: NavigationItem[] = [
  { href: "/", label: "Обзор", icon: "⌂" },
  { href: "/map", label: "Карта", icon: "⌁" },
  { href: "/lessons", label: "Урок", icon: "▤" },
  { href: "/mascots", label: "Маскоты", icon: "✳" },
  { href: "/studio", label: "Студия", icon: "✧" },
  { href: "/profile", label: "Профиль", icon: "◉" },
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
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
