import Link from "next/link";
import { PageHeading } from "@/src/components/PageHeading";
import { HomeCompanion } from "@/src/components/HomeCompanion";
import { QuickWarmup } from "@/src/components/QuickWarmup";
import { HomeLearningPath } from "@/src/components/HomeLearningPath";

export default function HomePage() {
  return (
    <>
      <PageHeading
        className="home-page-heading"
        eyebrow="ТВОЁ УЧЕБНОЕ ПРОСТРАНСТВО"
        title="Привет, исследователь!"
        description="Выбери следующий маленький шаг — и двигайся в своём ритме."
        icon=""
      />

      <HomeLearningPath />

      <section className="home-widgets" aria-label="Твоё пространство">
        <HomeCompanion />
        <QuickWarmup />
        <article className="home-next-card">
          <span className="home-widget-icon">▤</span>
          <span className="eyebrow">ПРАКТИЧЕСКИЕ ТЕМЫ</span>
          <h2>Навыки на каждый день</h2>
          <p>Бюджет, расписание, покупки, работа и домашние дела — с понятными примерами.</p>
          <Link href="/lessons" className="text-button">Открыть каталог <span aria-hidden="true">→</span></Link>
        </article>
        <article className="home-next-card home-quiet-card">
          <span className="home-widget-icon">✿</span>
          <span className="eyebrow">БЕЗ ДАВЛЕНИЯ</span>
          <h2>Учись в своём темпе</h2>
          <p>Ошибки помогают понять материал. Можно повторить вопрос и спокойно прочитать разбор.</p>
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
