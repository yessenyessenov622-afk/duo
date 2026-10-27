import { ComingSoon } from "@/src/components/ComingSoon";
import { PageHeading } from "@/src/components/PageHeading";

export default function ProfilePage() {
  return (
    <>
      <PageHeading
        eyebrow="ТВОЁ ПРОСТРАНСТВО"
        title="Профиль"
        description="Здесь будут настройки профиля, выбранный спутник и реальные результаты обучения."
        icon="◉"
      />
      <section className="profile-banner profile-preview">
        <div className="profile-avatar" aria-hidden="true">✿</div>
        <div className="profile-info">
          <span className="eyebrow">ДЕМО-КАРКАС</span>
          <h2>Профиль пока не создан</h2>
          <p>Вход и сохранение личных данных не подключены.</p>
        </div>
      </section>
      <ComingSoon
        title="Реальные данные появятся позже"
        description="Сейчас нет аккаунтов, прогресса пользователя или синхронизации с сервером. Эти возможности будут добавлены после подготовки интерфейса."
      />
    </>
  );
}
