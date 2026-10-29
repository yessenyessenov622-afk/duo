import Script from "next/script";
import { appearanceBootstrap } from "@/src/lib/appearance";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/src/styles/base.css";
import "@/src/styles/welcome.css";
import "@/src/styles/app-shell.css";
import "@/src/styles/customization.css";
import "@/src/styles/learning-map.css";
import "@/src/styles/appearance.css";
import "@/src/styles/mascots.css";
import "@/src/styles/account.css";
import "@/src/styles/appearance-menu.css";
import "@/src/styles/pixel-art.css";
import "@/src/styles/hardio-auth.css";
import { SiteShell } from "@/src/components/SiteShell";

export const metadata: Metadata = {
  title: "KiraQuest — учёба в своём ритме",
  description: "Небольшие учебные приключения, которые помогают двигаться вперёд шаг за шагом.",
  icons: {
    icon: "/favicon.svg",
  },
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <Script id="appearance-bootstrap" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: appearanceBootstrap() }} />
        <a className="skip-link" href="#main-content">Перейти к содержимому</a>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
