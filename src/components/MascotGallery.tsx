"use client";

import Link from "next/link";
import { useState } from "react";
import { mascotPreviews } from "@/src/data/mascots";
import { useCustomization } from "@/src/components/CustomizationProvider";
import { MascotAvatar } from "@/src/components/MascotAvatar";

export function MascotGallery() {
  const { settings, save } = useCustomization();
  const [notice, setNotice] = useState("");
  return <>
    <div className="mascot-gallery-intro"><span className="eyebrow">СПУТНИКИ KIRAQUEST</span><p>У каждого свой характер и добрые слова поддержки. Выбор можно поменять в любой момент.</p><Link href="/studio" className="button button-soft">Открыть студию <span aria-hidden="true">→</span></Link></div>
    <section className="mascot-grid mascot-select-grid" aria-label="Выбери спутника">
      {mascotPreviews.map((mascot) => {
        const selected = mascot.id === settings.mascot.id;
        return <article className={`mascot-card mascot-select-card${selected ? " mascot-selected" : ""}`} key={mascot.id}>
          <MascotAvatar id={mascot.id} accessory={selected ? settings.mascot.accessory : "none"} className="mascot-gallery-avatar" />
          <div className="mascot-gallery-copy"><span className="eyebrow">{mascot.kind.toUpperCase()}</span><h2>{mascot.name}</h2><p>{mascot.description}. {mascot.personality}</p><blockquote>«{mascot.greeting[0]}»</blockquote></div>
          <button className={`button ${selected ? "button-soft" : "button-outline"}`} aria-pressed={selected} onClick={() => {
            const ok = save({ ...settings, mascot: { ...settings.mascot, id: mascot.id } });
            setNotice(ok ? `${mascot.name} теперь твой спутник.` : "Не удалось сохранить выбор. Проверь доступ к локальному хранилищу.");
          }}>{selected ? "✓ Твой спутник" : "Выбрать спутника"}</button>
        </article>;
      })}
    </section>
    <p className="studio-local-note" role="status">{notice || "Выбранный спутник и его аксессуар сохраняются только в этом браузере."}</p>
  </>;
}
