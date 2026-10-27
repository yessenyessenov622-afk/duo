import { LessonExperience } from "@/src/components/LessonExperience";
import { PageHeading } from "@/src/components/PageHeading";

type LessonsPageProps = { searchParams: Promise<{ lesson?: string | string[] }> };

export default async function LessonsPage({ searchParams }: LessonsPageProps) {
  const params = await searchParams;
  const lessonId = typeof params.lesson === "string" ? params.lesson : "";
  return (
    <>
      <PageHeading
        eyebrow="ОДИН ШАГ ЗА РАЗ"
        title={lessonId ? "Короткий урок" : "Учебная карта"}
        description={lessonId ? "Одно небольшое задание, чтобы закрепить тему и открыть следующий шаг." : "Выбери направление на карте и продолжи путь с подходящего урока."}
        icon="▤"
      />
      <LessonExperience lessonId={lessonId} />
    </>
  );
}
