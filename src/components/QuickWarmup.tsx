"use client";

import { useState } from "react";

const choices = ["5/6", "1", "7/6"];

export function QuickWarmup() {
  const [answer, setAnswer] = useState<string | null>(null);
  const correct = answer === "5/6";
  return <section className={`home-quick-warmup${correct ? " is-correct" : ""}`} aria-labelledby="quick-warmup-title">
    <div className="quick-warmup-heading"><span className="quick-warmup-mark" aria-hidden="true">2′</span><div><p className="eyebrow">БЫСТРАЯ РАЗМИНКА · 2 МИНУТЫ</p><h2 id="quick-warmup-title">Сложи дроби: ⅔ + ⅙</h2></div></div>
    <fieldset className="quick-warmup-choices"><legend className="visually-hidden">Выбери ответ</legend>{choices.map((choice) => <button type="button" key={choice} aria-pressed={answer === choice} className={answer === choice ? "chosen" : ""} onClick={() => setAnswer(choice)}>{choice}</button>)}</fieldset>
    <p className="quick-warmup-feedback" role="status" aria-live="polite">{answer ? correct ? "Верно: ⅔ + ⅙ = 4/6 + 1/6 = 5/6. Хорошая разминка!" : "Почти. Приведи дроби к общему знаменателю 6 и попробуй ещё раз." : "Небольшая задача без оценки и таймера."}</p>
    {correct && <span className="warmup-sparkles" aria-hidden="true">✦ · ✧</span>}
  </section>;
}
