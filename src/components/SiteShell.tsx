import Link from "next/link";
import type { ReactNode } from "react";
import { APP_NAME } from "@/src/lib/site";
import { Navigation } from "@/src/components/Navigation";
import { SiteHeader } from "@/src/components/SiteHeader";
import { CustomizationProvider } from "@/src/components/CustomizationProvider";
import { LearningProgressProvider } from "@/src/components/LearningProgressProvider";
import { AccountProvider } from "@/src/components/AccountProvider";
import { AccountBoundary, AccountStatus } from "@/src/components/AccountBoundary";
import { ActivityTracker } from "@/src/components/ActivityTracker";

type SiteShellProps = {
  children: ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <AccountProvider><CustomizationProvider>
    <LearningProgressProvider>
    <ActivityTracker />
    <div className="app-shell">
      <aside className="sidebar" aria-label="Главная навигация">
        <Link className="brand" href="/" aria-label={`${APP_NAME} — на главную`}>
          <span className="brand-mark" aria-hidden="true">k</span>
          <span>
            Kira<span className="brand-light">Quest</span>
          </span>
        </Link>
        <div className="side-label">ТВОЁ ПРОСТРАНСТВО</div>
        <Navigation />
        <div className="sidebar-bottom">
          <div className="local-badge">
            <span className="status-dot" aria-hidden="true" />
            <AccountStatus />
          </div>
        </div>
      </aside>
      <div className="main-area">
        <SiteHeader />
        <main className="view-root" id="main-content" tabIndex={-1}>
          <AccountBoundary>{children}</AccountBoundary>
        </main>
        <footer className="app-footer">
          <span>{APP_NAME}</span>
          <span>Учись в своём ритме <span className="footer-heart">✦</span></span>
          <span>Мы учитываем посещения и примерное активное время уроков; гостевые посещения считаются отдельно.</span>
        </footer>
      </div>
    </div>
    </LearningProgressProvider>
    </CustomizationProvider></AccountProvider>
  );
}
