import Link from "next/link";
import { PageHeading } from "@/src/components/PageHeading";
import { HomeCompanion } from "@/src/components/HomeCompanion";

export default function HomePage() {
  return (
    <>
      <PageHeading
        eyebrow="ТВОЁ УЧЕБНОЕ ПРОСТРАНСТВО"
        title="Привет, исследователь!"
        description="Выбери следующий маленький шаг — и двигайся в своём ритме."
        icon="✦"
      />

      <section className="hero-panel home-hero">
        <div className="hero-copy">
          <span className="hero-kicker"><span>✧</span> ТВОЙ СЛЕДУЮЩИЙ ШАГ</span>
          <h2>Начни первое приключение</h2>
          <p>Учебная карта готовится. Пока можно познакомиться со спутниками и настроить свой мир.</p>
          <div className="hero-meta">
            <span>В своём темпе</span>
            <span>Без спешки</span>
          </div>
          <Link className="button button-dark" href="/map">
            Открыть карту <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-sun" />
          <div className="hero-mountain mountain-back" />
          <div className="hero-mountain mountain-front" />
          <div className="hero-path" />
          <span className="hero-star star-one">✦</span>
          <span className="hero-star star-two">✧</span>
          <div className="hero-character">🐈</div>
          <span className="art-label">шаг за шагом</span>
        </div>
      </section>

      <section className="home-widgets" aria-label="Твоё пространство">
        <HomeCompanion />
        <article className="home-next-card">
          <span className="home-widget-icon">⌁</span>
          <span className="eyebrow">ТВОЙ МАРШРУТ</span>
          <h2>Карта ждёт первого шага</h2>
          <p>Сейчас здесь ещё нет выбранного курса или сохранённого прогресса.</p>
          <Link href="/map" className="text-button">Посмотреть карту <span aria-hidden="true">→</span></Link>
        </article>
        <article className="home-next-card home-quiet-card">
          <span className="home-widget-icon">✿</span>
          <span className="eyebrow">БЕЗ ДАВЛЕНИЯ</span>
          <h2>Начинай когда удобно</h2>
          <p>Здесь появятся рекомендации, когда будет доступен учебный маршрут.</p>
        </article>
      </section>

      <section className="section-heading next-step-heading">
        <div>
          <p className="eyebrow">ОСНОВА УЧЕБНОГО ПУТИ</p>
          <h2>Куда отправимся?</h2>
        </div>
      </section>
      <section className="stage-link-grid" aria-label="Основные разделы">
        <Link className="stage-link" href="/map">
          <span className="stage-link-icon lavender">⌁</span>
          <span><b>Карта обучения</b><small>Главы и учебные шаги</small></span>
          <span className="stage-link-arrow" aria-hidden="true">→</span>
        </Link>
        <Link className="stage-link" href="/lessons">
          <span className="stage-link-icon mint">▤</span>
          <span><b>Уроки</b><small>Короткие задания и объяснения</small></span>
          <span className="stage-link-arrow" aria-hidden="true">→</span>
        </Link>
        <Link className="stage-link" href="/mascots">
          <span className="stage-link-icon peach">✳</span>
          <span><b>Коллекция маскотов</b><small>Персонажи KiraQuest</small></span>
          <span className="stage-link-arrow" aria-hidden="true">→</span>
        </Link>
        <Link className="stage-link" href="/profile">
          <span className="stage-link-icon blue">◉</span>
          <span><b>Профиль</b><small>Личная информация и прогресс</small></span>
          <span className="stage-link-arrow" aria-hidden="true">→</span>
        </Link>
        <Link className="stage-link" href="/studio">
          <span className="stage-link-icon lavender">✧</span>
          <span><b>Моя студия</b><small>Тема, фон и спутник</small></span>
          <span className="stage-link-arrow" aria-hidden="true">→</span>
        </Link>
      </section>

      <p className="stage-disclosure">Настройки оформления сохраняются локально в этом браузере. Аккаунт и синхронизация учебного прогресса не подключены.</p>
    </>
  );
}
