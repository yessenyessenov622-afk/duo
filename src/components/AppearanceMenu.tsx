"use client";

import { useEffect, useRef, useState } from "react";
import { useCustomization } from "@/src/components/CustomizationProvider";
import { QUICK_THEMES, VISUAL_STYLES } from "@/src/lib/appearance-options";
import { DEFAULT_SETTINGS } from "@/src/lib/customization";
import type { CustomizationSettings } from "@/src/types/customization";

type Menu = "themes" | "styles" | "mode";
export function AppearanceMenu() {
  const { settings, ready, save } = useCustomization();
  const [open, setOpen] = useState<Menu | null>(null);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(null); root.current?.querySelector<HTMLButtonElement>(`[data-menu-trigger="${open}"]`)?.focus(); } };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [open]);
  const choose = (change: Partial<CustomizationSettings>) => { if (save({ ...settings, ...change })) setOpen(null); };
  const reset = () => choose({ theme: DEFAULT_SETTINGS.theme, themeMode: DEFAULT_SETTINGS.themeMode, visualStyle: DEFAULT_SETTINGS.visualStyle, accentMode: DEFAULT_SETTINGS.accentMode, accent: DEFAULT_SETTINGS.accent, background: DEFAULT_SETTINGS.background });
  return <div className="appearance-menu" ref={root}>
    {([ ["themes", "🎨", "Темы"], ["styles", "▣", "Стили"], ["mode", "◐", "Режим"] ] as const).map(([id, icon, label]) => <div className="appearance-menu-anchor" key={id}>
      <button type="button" disabled={!ready} className="appearance-trigger" data-menu-trigger={id} aria-expanded={open === id} aria-controls={`appearance-${id}`} onClick={() => setOpen(open === id ? null : id)}><span aria-hidden="true">{icon}</span><span className="appearance-trigger-label">{label}</span></button>
      {open === id && <section id={`appearance-${id}`} className="appearance-popover" aria-label={label}>
        <div className="appearance-popover-heading"><strong>{label}</strong><button type="button" aria-label="Закрыть меню" onClick={() => setOpen(null)}>×</button></div>
        {id === "themes" && <div className="appearance-choices">{QUICK_THEMES.map(theme => <button type="button" key={theme.id} aria-pressed={settings.theme === theme.id} onClick={() => choose({ theme: theme.id })}><i className="appearance-swatch" style={{ background: theme.color }} /><span>{theme.label}</span>{settings.theme === theme.id && <b aria-hidden="true">✓</b>}</button>)}</div>}
        {id === "styles" && <div className="appearance-choices">{VISUAL_STYLES.map(style => <button type="button" key={style.id} aria-pressed={settings.visualStyle === style.id} onClick={() => choose({ visualStyle: style.id })}><span className="visual-style-mini" data-mini-style={style.id} aria-hidden="true"><i /><i /><i /></span><span><strong>{style.label}</strong><small>{style.description}</small></span>{settings.visualStyle === style.id && <b aria-hidden="true">✓</b>}</button>)}</div>}
        {id === "mode" && <div className="appearance-choices">{([ ["light", "☀", "Светлый"], ["dark", "☾", "Тёмный"], ["system", "◐", "Как на устройстве"] ] as const).map(([value, icon, name]) => <button type="button" key={value} aria-pressed={settings.themeMode === value} onClick={() => choose({ themeMode: value })}><span aria-hidden="true">{icon}</span><span>{name}</span>{settings.themeMode === value && <b aria-hidden="true">✓</b>}</button>)}</div>}
        <button className="appearance-reset" type="button" onClick={reset}>Сбросить оформление</button>
      </section>}
    </div>)}
  </div>;
}
