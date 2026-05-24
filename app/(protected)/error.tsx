"use client";

export default function ProtectedError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
      <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
      <p className="mt-1 text-sm text-red-700">An unexpected issue occurred while loading this page.</p>
      <button className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white" onClick={reset} type="button">Try again</button>
    </div>
  );
}
