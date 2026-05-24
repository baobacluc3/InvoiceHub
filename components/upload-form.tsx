"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

export function UploadForm({ action, children }: { action: (formData: FormData) => void; children: React.ReactNode }) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileNames, setFileNames] = useState<string[]>([]);

  const selectedLabel = useMemo(() => {
    if (fileNames.length === 0) return "No files selected";
    return `${fileNames.length} file${fileNames.length > 1 ? "s" : ""} selected`;
  }, [fileNames]);

  return (
    <form action={action} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {children}
      <label
        className={`block rounded-xl border-2 border-dashed p-6 text-center transition ${isDragging ? "border-slate-900 bg-slate-100" : "border-slate-300 bg-slate-50"}`}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDrop={() => setIsDragging(false)}
      >
        <span className="block text-sm font-medium text-slate-700">Drag and drop files here, or click to browse</span>
        <span className="mt-1 block text-xs text-slate-500">PDF, JPG, PNG up to 10MB each</span>
        <input
          className="mt-4 w-full rounded-lg border bg-white p-2 text-sm"
          name="files"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          multiple
          required
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            setFileNames(files.map((file) => file.name));
          }}
        />
      </label>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm font-medium text-slate-700">{selectedLabel}</p>
        {fileNames.length > 0 ? (
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {fileNames.map((name) => (
              <li key={name}>• {name}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <SubmitButton />
    </form>
  );
}


function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={pending}>
      {pending ? "Uploading..." : "Upload documents"}
    </button>
  );
}
