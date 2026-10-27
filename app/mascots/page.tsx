import { PageHeading } from "@/src/components/PageHeading";
import { MascotGallery } from "@/src/components/MascotGallery";

export default function MascotsPage() {
  return (
    <>
      <PageHeading eyebrow="ТВОЯ КОМАНДА" title="Коллекция маскотов" description="Познакомься со спутниками и выбери того, кто отправится с тобой." icon="✳" />
      <MascotGallery />
    </>
  );
}
