"use client";

export default function SaturationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-lg border border-red-300 bg-red-50 p-6 text-sm">
      <h2 className="text-lg font-bold text-red-700 mb-2">
        Ad Saturation Error
      </h2>
      <pre className="whitespace-pre-wrap text-red-600 mb-4">
        {error.message}
      </pre>
      {error.digest && (
        <p className="text-xs text-red-400 mb-4">Digest: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="rounded bg-red-600 px-4 py-2 text-white text-sm font-medium hover:bg-red-700"
      >
        Try Again
      </button>
    </div>
  );
}
