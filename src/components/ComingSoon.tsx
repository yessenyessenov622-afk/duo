type ComingSoonProps = {
  title: string;
  description: string;
};

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <section className="stage-note" aria-label="Экран подготовлен">
      <span className="stage-note-icon" aria-hidden="true">✧</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <span className="stage-label">СЛЕДУЮЩИЙ ЭТАП</span>
    </section>
  );
}
