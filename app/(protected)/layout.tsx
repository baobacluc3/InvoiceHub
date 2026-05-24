import Link from "next/link";
import { requireAuth } from "@/lib/auth-guards";

const navItems = [
  ["Dashboard", "/dashboard"],
  ["Documents", "/documents"],
  ["Upload", "/upload"],
  ["Companies", "/companies"],
  ["OCR Review", "/ocr-review"],
  ["Admin", "/admin"],
  ["Logs", "/logs"],
  ["Exports", "/exports"],
] as const;

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[230px_1fr]">
        <aside className="border-r border-slate-200 bg-white p-4 lg:p-6">
          <h1 className="text-xl font-bold text-slate-900">InvoiceHub</h1>
          <p className="mt-1 text-xs text-slate-500">Accounting Automation</p>
          <nav className="mt-6 space-y-1">
            {navItems.map(([label, href]) => (
              <Link key={href} href={href} className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900">
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="border-b border-slate-200 bg-white px-4 py-4 lg:px-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Signed in</p>
              <p className="text-sm text-slate-700">{user.email}</p>
            </div>
          </header>
          <main className="p-4 lg:p-8">{children}</main>
        </section>
      </div>
    </div>
  );
}
