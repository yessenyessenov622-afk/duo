import { LearnerProfile } from "@/src/components/LearnerProfile";
import { PageHeading } from "@/src/components/PageHeading";

export default function ProfilePage() {
  return <>
    <PageHeading eyebrow="ТВОЙ ПРОГРЕСС" title="Профиль обучения" description="Посмотри, какие навыки ты тренировал, и продолжи с любого маршрута." icon="◉" />
    <LearnerProfile />
  </>;
}
