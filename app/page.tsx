import Link from "next/link";
import { auth, signIn, signOut } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">InvoiceHub Foundation</h1>
      <p className="text-slate-600">Core architecture, auth, models, and route placeholders are ready.</p>
      <div className="flex gap-3">
        {session ? (
          <>
            <Link className="rounded bg-slate-900 px-4 py-2 text-white" href="/dashboard">Go to Dashboard</Link>
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <button className="rounded border px-4 py-2" type="submit">Sign out</button>
            </form>
          </>
        ) : (
          <form
            action={async () => {
              "use server";
              await signIn("google");
            }}
          >
            <button className="rounded bg-slate-900 px-4 py-2 text-white" type="submit">Sign in with Google</button>
          </form>
        )}
      </div>
    </main>
  );
}
