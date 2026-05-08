'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import CommandPreview from '@/components/CommandPreview';
import OutputPanel from '@/components/OutputPanel';
import { useWorkingDir } from '@/components/WorkingDirProvider';
import { buildStatusArgs, argsToCommand } from '@/lib/cli';
import { RefreshCw, Server, Database, Network, Shield } from 'lucide-react';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  agent: <Server size={14} />,
  memory: <Database size={14} />,
  gateway: <Network size={14} />,
  credential: <Shield size={14} />,
};

const STATE_COLORS: Record<string, string> = {
  deployed: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
  'local-only': 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  'pending-removal': 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400',
};

export default function DashboardPage() {
  const { cwd } = useWorkingDir();
  const [stdout, setStdout] = useState('');
  const [stderr, setStderr] = useState('');
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState<any[]>([]);

  const args = buildStatusArgs();

  const run = async () => {
    setLoading(true);
    setStdout('');
    setStderr('');
    setResources([]);
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ args, cwd }),
      });
      const data = await res.json();
      setStdout(data.stdout);
      setStderr(data.stderr);
      setExitCode(data.exitCode);
      try {
        const parsed = JSON.parse(data.stdout);
        if (Array.isArray(parsed.resources)) setResources(parsed.resources);
      } catch { /* raw text output */ }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Header title="Dashboard" />
      <div className="flex-1 overflow-auto p-6 space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Run{' '}
            <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs text-slate-700 dark:text-slate-200">
              agentcore status
            </code>{' '}
            to see deployed resources in your project directory.
          </p>
          <button
            onClick={run}
            disabled={loading}
            className="flex items-center gap-2 bg-[#FF9900] hover:bg-[#E88900] text-black text-sm font-semibold px-4 py-2 rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading…' : 'Refresh Status'}
          </button>
        </div>

        <CommandPreview command={argsToCommand(args)} />

        {resources.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {resources.map((r: any, i: number) => (
              <div
                key={i}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400">
                      {TYPE_ICONS[r.resourceType] ?? <Server size={14} />}
                    </span>
                    <span className="font-medium text-slate-900 dark:text-white text-sm truncate">
                      {r.name ?? r.runtimeName ?? '—'}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      STATE_COLORS[r.state] ?? STATE_COLORS['local-only']
                    }`}
                  >
                    {r.state ?? 'local-only'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 capitalize">{r.resourceType}</p>
                {r.runtimeId && (
                  <p className="text-xs font-mono text-slate-600 truncate">{r.runtimeId}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <OutputPanel output={stdout} error={stderr} exitCode={exitCode} loading={loading} />
      </div>
    </div>
  );
}
