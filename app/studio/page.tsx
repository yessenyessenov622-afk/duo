import { PageHeading } from "@/src/components/PageHeading";
import { Studio } from "@/src/components/Studio";

export default function StudioPage() {
  return <>
    <PageHeading eyebrow="ТВОЙ МИР — ТВОИ ПРАВИЛА" title="Моя студия" description="Настрой пространство и выбери спутника. Изменения остаются в этом браузере." icon="✧" />
    <Studio />
  </>;
}
