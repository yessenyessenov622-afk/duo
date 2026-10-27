import { LessonExperience } from "@/src/components/LessonExperience";
import { PageHeading } from "@/src/components/PageHeading";
import { CourseCatalog } from "@/src/components/CourseCatalog";

type LessonsPageProps = { searchParams: Promise<{ lesson?: string | string[] }> };

export default async function LessonsPage({ searchParams }: LessonsPageProps) {
  const params = await searchParams;
  const lessonId = typeof params.lesson === "string" ? params.lesson : "";
  return (
    <>
      <PageHeading
        eyebrow={lessonId ? "ОДИН ШАГ ЗА РАЗ" : "ПРАКТИЧЕСКИЕ НАВЫКИ"}
        title={lessonId ? "Короткий урок" : "Каталог уроков"}
        description={lessonId ? "Короткое объяснение, жизненный пример, твой выбор и понятный разбор результата." : "Выбери направление и продолжай с любого доступного первого шага."}
        icon="▤"
      />
      {lessonId ? <LessonExperience key={lessonId} lessonId={lessonId} /> : <CourseCatalog />}
    </>
  );
}
