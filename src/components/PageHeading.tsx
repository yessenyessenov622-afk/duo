type PageHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon?: string;
};

export function PageHeading({ eyebrow, title, description, icon = "✧" }: PageHeadingProps) {
  return (
    <section className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="lead">{description}</p>
      </div>
      <div className="heading-decoration" aria-hidden="true">
        {icon}
      </div>
    </section>
  );
}
