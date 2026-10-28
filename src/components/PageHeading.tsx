"use client";

import { useCustomization } from "@/src/components/CustomizationProvider";

type PageHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon?: string;
  className?: string;
  retroTitle?: string;
};

export function PageHeading({ eyebrow, title, description, icon = "✧", className = "", retroTitle }: PageHeadingProps) {
  const { settings } = useCustomization();
  return (
    <section className={`page-heading ${className}`.trim()}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{settings.visualStyle === "retro-desktop" && retroTitle ? retroTitle : title}</h1>
        <p className="lead">{description}</p>
      </div>
      {icon && <div className="heading-decoration" aria-hidden="true">{icon}</div>}
    </section>
  );
}
