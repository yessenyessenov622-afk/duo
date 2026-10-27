type PageHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon?: string;
  className?: string;
};

export function PageHeading({ eyebrow, title, description, icon = "✧", className = "" }: PageHeadingProps) {
  return (
    <section className={`page-heading ${className}`.trim()}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="lead">{description}</p>
      </div>
      {icon && <div className="heading-decoration" aria-hidden="true">{icon}</div>}
    </section>
  );
}
