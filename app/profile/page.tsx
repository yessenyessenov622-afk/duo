import { LearnerProfile } from "@/src/components/LearnerProfile";
import { PageHeading } from "@/src/components/PageHeading";
import { AccountPanel } from "@/src/components/AccountPanel";

export default function ProfilePage() {
  return <>
    <PageHeading eyebrow="ТВОЙ ПРОГРЕСС" title="Профиль обучения" retroTitle="Карточка ученика" description="Посмотри, какие навыки ты тренировал, и продолжи с любого маршрута." icon="◉" />
    <AccountPanel />
    <LearnerProfile />
  </>;
}
