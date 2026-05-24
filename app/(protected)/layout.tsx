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
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <div>
            <h1 className="text-xl font-semibold">InvoiceHub</h1>
            <p className="text-sm text-slate-600">Signed in as {user.email}</p>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            {navItems.map(([label, href]) => (
              <Link className="rounded border px-3 py-1" href={href} key={href}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}
