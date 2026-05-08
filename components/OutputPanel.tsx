'use client';

interface Props {
  output?: string;
  error?: string;
  exitCode?: number | null;
  loading?: boolean;
}

export default function OutputPanel({ output, error, exitCode, loading }: Props) {
  if (!output && !error && !loading) return null;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-700">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Output</span>
        {exitCode !== undefined && exitCode !== null && (
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded ${
              exitCode === 0
                ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400'
            }`}
          >
            exit {exitCode}
          </span>
        )}
      </div>
      <div className="p-4 space-y-2">
        {loading && !output && (
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
            <span className="animate-pulse text-[#FF9900]">●</span> Running…
          </div>
        )}
        {output && (
          <pre className="text-sm text-slate-800 dark:text-slate-200 font-mono whitespace-pre-wrap break-words leading-relaxed">
            {output}
          </pre>
        )}
        {error && (
          <pre className="text-sm text-red-400 font-mono whitespace-pre-wrap break-words leading-relaxed">
            {error}
          </pre>
        )}
      </div>
    </div>
  );
}
