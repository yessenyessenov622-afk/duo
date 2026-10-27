import { PageHeading } from "@/src/components/PageHeading";
import { LearningMap } from "@/src/components/LearningMap";

export default function MapPage() {
  return (
    <>
      <PageHeading eyebrow="КАРТА ПРИКЛЮЧЕНИЙ" title="Твой путь обучения" description="Короткие главы, понятные шаги и новые открытия — в комфортном темпе." icon="⌁" />
      <LearningMap />
    </>
  );
}
