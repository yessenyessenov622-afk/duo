import Link from "next/link";
import { PageHeading } from "@/src/components/PageHeading";
import { HomeCompanion } from "@/src/components/HomeCompanion";
import { HomeLearningPath } from "@/src/components/HomeLearningPath";
import { AccountStorageNote } from "@/src/components/AccountBoundary";

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
        <article className="home-next-card"><span className="eyebrow">ПРОДОЛЖАЙ В СВОЁМ ТЕМПЕ</span><h2>Твой следующий шаг</h2><p>На карте видно, что уже пройдено и какой урок открыт дальше.</p><Link href="/map" className="text-button">Открыть карту →</Link></article>
      </section>

      <AccountStorageNote />
    </>
  );
}
