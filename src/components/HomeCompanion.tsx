"use client";

import Link from "next/link";
import { mascotPreviews } from "@/src/data/mascots";
import { useCustomization } from "@/src/components/CustomizationProvider";
import { useLearningProgress } from "@/src/components/LearningProgressProvider";
import { useEffect, useState } from "react";

export function HomeCompanion() {
  const { settings, ready } = useCustomization();
  const { progress, ready: progressReady } = useLearningProgress();
  const [, setMinute] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => setMinute((value) => value + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const mascot = mascotPreviews.find((item) => item.id === settings.mascot.id) ?? mascotPreviews[0];
  const now = Date.now();
  const status = progress.activeLessonId && progress.lastActivityAt && now - progress.lastActivityAt < 2 * 60 * 60 * 1000
    ? "Учимся вместе"
    : progress.lastModuleCompletedAt && now - progress.lastModuleCompletedAt < 24 * 60 * 60 * 1000
      ? "Горжусь тобой"
      : "Отдыхает";
  const message = status === "Учимся вместе"
    ? "Я рядом, пока ты проходишь урок. Можно двигаться в своём темпе."
    : status === "Горжусь тобой"
      ? "Ты завершил модуль — это большой шаг. Можно сделать паузу."
      : "Я отдохну рядом, пока ты будешь готов к следующему шагу.";
  return (
    <section className="home-companion" aria-label="Твой спутник">
      <div className="companion-copy">
        <span className="eyebrow">ТВОЙ СПУТНИК · {progressReady ? status.toLocaleUpperCase("ru") : "ГОТОВИТСЯ"}</span>
        <h2>{mascot.name} рядом</h2>
        {ready && progressReady && settings.quoteFrequency !== "minimal" && !dismissed ? <div className="companion-speech"><p>{message}</p><button type="button" onClick={() => setDismissed(true)}>Спасибо, понятно</button></div> : <p>{ready ? mascot.greeting[new Date().getDay() % mascot.greeting.length] : "Твой спутник уже готов к знакомству."}</p>}
        <Link href="/studio" className="text-button">Настроить пространство <span aria-hidden="true">→</span></Link>
      </div>
    </section>
  );
}
