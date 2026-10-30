import { headers } from "next/headers";
import Link from "next/link";
import { withOwner } from "@/src/server/owner";
import { AdminReviewsPanel } from "@/src/components/AdminReviewsPanel";

export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const request = new Request("https://kiraquest.invalid/admin", { headers: new Headers(await headers()) });
  try { await withOwner(request, async () => undefined); }
  catch { return <section className="account-card"><h1>Нет доступа</h1><p>Панель доступна только владельцу после входа в аккаунт и разблокировки устройства.</p><Link className="text-button" href="/sign-in">Войти</Link></section>; }
  return <AdminReviewsPanel />;
}
