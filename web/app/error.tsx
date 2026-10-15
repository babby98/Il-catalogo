"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-[50vh] place-items-center text-center">
      <div className="glass max-w-md p-8">
        <p className="eyebrow mb-3">Connection lost</p>
        <p className="text-lg text-zinc-200">Couldn’t reach the catalogue API.</p>
        <p className="mt-2 text-sm text-zinc-500">
          Make sure it’s running: <code className="data text-zinc-300">uvicorn api:app --port 8000</code>
        </p>
        <p className="data mt-4 truncate text-xs text-zinc-600">{error.message}</p>
        <button
          onClick={reset}
          className="mt-6 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

