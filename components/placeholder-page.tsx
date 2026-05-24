export function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="rounded-lg border bg-white p-8">
      <h2 className="text-2xl font-semibold capitalize">{title}</h2>
      <p className="mt-2 text-slate-600">
        This is a protected placeholder page for the foundation branch. Feature implementation will happen in follow-up branches.
      </p>
    </section>
  );
}
