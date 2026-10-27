"use client";

import { useEffect, useState } from "react";
import { mascotPreviews } from "@/src/data/mascots";
import { appearanceStyle, PALETTES } from "@/src/lib/appearance";
import { DEFAULT_SETTINGS } from "@/src/lib/customization";
import { useCustomization } from "@/src/components/CustomizationProvider";
import { MascotAvatar } from "@/src/components/MascotAvatar";
import type { BackgroundId, CustomizationSettings, ThemeId, VisualStyleId } from "@/src/types/customization";

const themeOptions: { id: ThemeId; label: string; icon: string }[] = [
  { id: "lavender", label: "Лунная лаванда", icon: "☾" }, { id: "light", label: "Светлая", icon: "☼" },
  { id: "dark", label: "Тёмная", icon: "◐" }, { id: "amber", label: "Солнечный янтарь", icon: "✺" },
  { id: "mint", label: "Кибер-мята", icon: "❋" }, { id: "sakura", label: "Сакура", icon: "✿" },
  { id: "ocean", label: "Океан", icon: "≈" }, { id: "forest", label: "Лесная экспедиция", icon: "♧" }, { id: "mono", label: "Монохром", icon: "◌" },
];
const backgrounds: { id: BackgroundId; label: string }[] = [
  { id: "custom", label: "Свой цвет" },
  { id: "quiet", label: "Спокойный" }, { id: "stars", label: "Звёздная ночь" }, { id: "library", label: "Уютная библиотека" },
  { id: "sakura", label: "Сакура" }, { id: "forest", label: "Туманный лес" }, { id: "ocean", label: "Подводная глубина" },
];
const accents = ["#8064d8", "#cf8d42", "#4d9c8a", "#d36f91", "#4689b5", "#748a5d", "#44414c"];
const accessoryOptions = [{ id: "none", label: "Без аксессуара", icon: "·" }, { id: "star", label: "Звёздная заколка", icon: "✦" }, { id: "glasses", label: "Очки исследователя", icon: "◉" }, { id: "scarf", label: "Мягкий шарф", icon: "〰" }, { id: "halo", label: "Светящийся ореол", icon: "✧" }];
type Category = "appearance" | "companion" | "preferences";

export function Studio() {
  const { settings: saved, ready, save, reset, warning } = useCustomization();
  const [draft, setDraft] = useState<CustomizationSettings>(saved);
  const [category, setCategory] = useState<Category>("appearance");
  const [notice, setNotice] = useState("");
  useEffect(() => { if (ready) setDraft(saved); }, [saved, ready]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const update = (changes: Partial<CustomizationSettings>) => { setNotice(""); setDraft((current) => ({ ...current, ...changes })); };
  const updateMascot = (changes: Partial<CustomizationSettings["mascot"]>) => { setNotice(""); setDraft((current) => ({ ...current, mascot: { ...current.mascot, ...changes } })); };
  const saveDraft = () => setNotice(save(draft) ? "Настройки сохранены в этом браузере." : "Браузер не разрешил сохранить настройки. Проверь доступ к локальному хранилищу.");
  const resetAll = () => {
    if (!window.confirm("Сбросить настройки студии к исходным?")) return;
    const ok = reset(); if (ok) setDraft(DEFAULT_SETTINGS); setNotice(ok ? "Настройки сброшены." : "Не удалось обновить локальное хранилище.");
  };
  const previewStyle = {
    ...appearanceStyle(draft),
    "--sample-font": `${14 * draft.fontScale * (draft.largeText ? 16 / 14 : 1)}px`,
  } as React.CSSProperties;
  const visualStyles: { id: VisualStyleId; label: string; description: string }[] = [
    { id: "calm", label: "Спокойный", description: "Мягкие поверхности и тонкие границы." },
    { id: "soft-brutalism-lite", label: "Soft Brutalism Lite", description: "Тонкие границы и мягкий акцентный объём." },
  ];
  if (!ready) return <p role="status">Загружаем настройки оформления…</p>;
  return <div className="studio-layout">
    <section className="studio-preview-panel" data-visual-style={draft.visualStyle} aria-label="Образец оформления" style={previewStyle}>
      <div className="studio-preview-top"><span className="eyebrow">ПРЕДПРОСМОТР</span><span className="studio-live-dot">● Образец</span></div>
      <div className="studio-preview-world" data-theme-preview={draft.theme} data-background-preview={draft.background} style={{ "--custom-wallpaper": draft.customBackground } as React.CSSProperties}>
        <span className="preview-orbit orbit-one" aria-hidden="true">✧</span><span className="preview-orbit orbit-two" aria-hidden="true">✦</span>
        <MascotAvatar id={draft.mascot.id} accessory={draft.mascot.accessory} className="studio-mascot" />
      </div>
      <div className="studio-preview-caption"><div><b>{mascotPreviews.find((item) => item.id === draft.mascot.id)?.name ?? "Мико"}</b><span>твой спутник</span></div><span className="preview-level">ТВОЁ ПРОСТРАНСТВО</span></div>
      <div className="appearance-sample" aria-label="Образец текста, акцента и отступов"><h3>Твой следующий шаг</h3><p>Так выглядят текст, цвет и отступы с выбранными настройками.</p><span>Продолжить обучение →</span></div>
      <p className="studio-local-note">Это образец оформления. Всё приложение изменится после нажатия «Сохранить». Настройки хранятся только в этом браузере.</p>
    </section>
    <section className="studio-controls" aria-label="Настройки персонализации">
      <div className="studio-tabs" aria-label="Категории студии">
        <button type="button" aria-pressed={category === "appearance"} className={category === "appearance" ? "selected" : ""} onClick={() => setCategory("appearance")}>◐ Внешний вид</button>
        <button type="button" aria-pressed={category === "companion"} className={category === "companion" ? "selected" : ""} onClick={() => setCategory("companion")}>✳ Спутник</button>
        <button type="button" aria-pressed={category === "preferences"} className={category === "preferences" ? "selected" : ""} onClick={() => setCategory("preferences")}>⚙ Настройки</button>
      </div>
      <div className="studio-options">
        {category === "appearance" && <>
          <div className="studio-group"><div className="studio-group-title"><h2>Стиль интерфейса</h2><small>Независимо от темы и цвета</small></div><div className="visual-style-options">{visualStyles.map((style) => <button type="button" key={style.id} aria-pressed={draft.visualStyle === style.id} className={draft.visualStyle === style.id ? "chosen" : ""} onClick={() => update({ visualStyle: style.id })}><b>{style.label}</b><small>{style.description}</small></button>)}</div></div>
          <div className="studio-group"><div className="studio-group-title"><h2>Тема пространства</h2><small>Образец слева; затем «Сохранить»</small></div><div className="theme-grid">{themeOptions.map((theme) => <button key={theme.id} className={`theme-choice theme-${theme.id}${draft.theme === theme.id ? " chosen" : ""}`} aria-pressed={draft.theme === theme.id} onClick={() => update({ theme: theme.id })}><span>{theme.icon}</span><b>{theme.label}</b></button>)}</div></div>
          <div className="studio-group"><div className="studio-group-title"><h2>Цветовой акцент</h2><small>Цвет темы или собственный</small></div><div className="accent-mode" aria-label="Источник акцента"><button type="button" aria-pressed={draft.accentMode === "theme"} onClick={() => update({ accentMode: "theme" })}>Цвет темы</button><button type="button" aria-pressed={draft.accentMode === "custom"} onClick={() => update({ accentMode: "custom" })}>Свой цвет</button></div><div className="accent-palette" aria-label="Цвета акцента">{accents.map((color) => <button type="button" key={color} aria-label={`Акцент ${color}`} aria-pressed={draft.accentMode === "custom" && draft.accent === color} className={draft.accentMode === "custom" && draft.accent === color ? "chosen" : ""} style={{ "--swatch": color } as React.CSSProperties} onClick={() => update({ accent: color, accentMode: "custom" })} />)}<label className="custom-color-control"><span>{"Свой цвет"}</span><input type="color" aria-label="Свой цвет акцента" value={draft.accentMode === "theme" ? PALETTES[draft.theme].accent : draft.accent} onChange={(event) => update({ accent: event.target.value, accentMode: "custom" })} /></label></div><p className="studio-hint">Свой цвет сохраняется при смене темы. Для читаемости текста его оттенок автоматически корректируется. «Цвет темы» возвращает встроенную палитру.</p></div>
          <div className="studio-group"><div className="studio-group-title"><h2>Фон пространства</h2><small>Ненавязчивый декор</small></div><div className="background-grid">{backgrounds.map((item) => <button className={draft.background === item.id ? "chosen" : ""} key={item.id} aria-pressed={draft.background === item.id} onClick={() => update({ background: item.id })}><span className={`background-swatch background-${item.id}`} style={item.id === "custom" ? { background: draft.customBackground } : undefined} aria-hidden="true" />{item.label}</button>)}</div><label className="custom-color-control custom-wallpaper-control"><span>{"Цвет фона"}</span><input type="color" aria-label="Цвет фона" value={draft.customBackground} onChange={(event) => update({ customBackground: event.target.value, background: "custom" })} /></label></div>
        </>}
        {category === "companion" && <>
          <div className="studio-group"><div className="studio-group-title"><h2>Выбери спутника</h2><small>Выбор сохраняется локально</small></div><div className="studio-mascot-list">{mascotPreviews.map((mascot) => <button key={mascot.id} className={draft.mascot.id === mascot.id ? "chosen" : ""} aria-pressed={draft.mascot.id === mascot.id} onClick={() => updateMascot({ id: mascot.id })}><span className="mini-mascot" style={{ "--mascot-bg": mascot.color } as React.CSSProperties}>{mascot.icon}</span><span><b>{mascot.name}</b><small>{mascot.description}</small></span><span className="choice-check">{draft.mascot.id === mascot.id ? "✓" : "＋"}</span></button>)}</div></div>
          <div className="studio-group"><div className="studio-group-title"><h2>Аксессуар</h2><small>Первые предметы доступны сразу</small></div><div className="accessory-grid">{accessoryOptions.map((item) => <button key={item.id} className={draft.mascot.accessory === item.id ? "chosen" : ""} aria-pressed={draft.mascot.accessory === item.id} onClick={() => updateMascot({ accessory: item.id })}><span>{item.icon}</span>{item.label}</button>)}</div><p className="studio-hint">Косметика сейчас декоративная и не даёт игровых преимуществ. Каталог разблокировок добавим вместе с реальной системой прогресса.</p></div>
        </>}
        {category === "preferences" && <>
          <div className="studio-group"><div className="studio-group-title"><h2>Тихие и удобные настройки</h2><small>Звук изначально выключен</small></div><div className="studio-setting-list">
            <label className="studio-setting"><span><b>{"Плотность интерфейса"}</b><small>{"Свободный или компактный отступ"}</small></span><select value={draft.density} onChange={(event) => update({ density: event.target.value as CustomizationSettings["density"] })}><option value="comfortable">{"Комфортный"}</option><option value="compact">{"Компактный"}</option></select></label>
            <label className="studio-setting"><span><b>{"Масштаб текста"}</b><small>{Math.round(draft.fontScale * 100)}%</small></span><input className="font-scale-control" type="range" min="0.9" max="1.2" step="0.1" value={draft.fontScale} aria-label="Масштаб текста" aria-valuetext={`${Math.round(draft.fontScale * 100)} процентов`} onChange={(event) => update({ fontScale: Number(event.target.value) })} /></label>
            <label className="studio-setting"><span><b>Анимации маскота</b><small>Уважает системное уменьшение движения</small></span><input type="checkbox" checked={draft.animations} onChange={(event) => update({ animations: event.target.checked })} /></label>
            <label className="studio-setting"><span><b>Звуки</b><small>Звуковые эффекты пока не используются</small></span><input type="checkbox" checked={draft.sounds} onChange={(event) => update({ sounds: event.target.checked })} /></label>
            <label className="studio-setting"><span><b>Крупный текст</b><small>Повышает размер текста интерфейса</small></span><input type="checkbox" checked={draft.largeText} onChange={(event) => update({ largeText: event.target.checked })} /></label>
            <label className="studio-setting"><span><b>Реплики спутника</b><small>Как часто показывать поддерживающие фразы</small></span><select value={draft.quoteFrequency} onChange={(event) => update({ quoteFrequency: event.target.value as CustomizationSettings["quoteFrequency"] })}><option value="often">Часто</option><option value="sometimes">Иногда</option><option value="minimal">Минимум</option></select></label>
          </div><p className="studio-hint">Переключатель звуков сохранён как предпочтение; воспроизведение звуков ещё не реализовано.</p></div>
        </>}
      </div>
      <div className="studio-actions"><span className="studio-save-state" role="status">{notice || (dirty ? "Есть несохранённые изменения" : warning ? "Можно сохранить восстановленные настройки" : "Все изменения сохранены")}</span><div><button className="button button-outline" onClick={() => { setDraft(saved); setNotice("Несохранённые изменения отменены."); }} disabled={!dirty}>Отменить</button><button className="button button-soft" onClick={resetAll}>Сбросить</button><button className="button button-dark" onClick={saveDraft} disabled={!dirty && !warning}>Сохранить</button></div></div>
    </section>
  </div>;
}
