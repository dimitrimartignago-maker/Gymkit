"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[AdminError]", error);
  }, [error]);

  return (
    <div className="p-6">
      <div className="rounded-lg border border-red-400 bg-red-50 p-4 text-red-900">
        <h2 className="mb-2 text-lg font-semibold">
          {error.name ?? "Errore"}: {error.message}
        </h2>
        {error.stack && (
          <pre className="mt-2 overflow-auto rounded bg-red-100 p-3 text-xs whitespace-pre-wrap">
            {error.stack}
          </pre>
        )}
        {error.digest && (
          <p className="mt-2 text-xs text-red-700">Digest: {error.digest}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="mt-4 rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 active:bg-red-800"
      >
        Riprova
      </button>
    </div>
  );
}
