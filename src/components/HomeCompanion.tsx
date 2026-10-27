"use client";

import Link from "next/link";
import { mascotPreviews } from "@/src/data/mascots";
import { MascotAvatar } from "@/src/components/MascotAvatar";
import { useCustomization } from "@/src/components/CustomizationProvider";

export function HomeCompanion() {
  const { settings, ready } = useCustomization();
  const mascot = mascotPreviews.find((item) => item.id === settings.mascot.id) ?? mascotPreviews[0];
  return (
    <section className="home-companion" aria-label="Твой спутник">
      <div className="companion-copy">
        <span className="eyebrow">ТВОЙ СПУТНИК</span>
        <h2>{mascot.name} рядом</h2>
        <p>{ready ? mascot.greeting[new Date().getDay() % mascot.greeting.length] : "Твой спутник уже готов к знакомству."}</p>
        <Link href="/studio" className="text-button">Настроить пространство <span aria-hidden="true">→</span></Link>
      </div>
      <MascotAvatar id={mascot.id} accessory={settings.mascot.accessory} className="companion-avatar" />
    </section>
  );
}
