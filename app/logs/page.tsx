'use client';

import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import Header from '@/components/Header';
import CommandPreview from '@/components/CommandPreview';
import { Field, Input, Select, RunButton } from '@/components/FormParts';
import { useWorkingDir } from '@/components/WorkingDirProvider';
import { buildLogsArgs, argsToCommand } from '@/lib/cli';

const LOG_LEVELS = ['', 'error', 'warn', 'info', 'debug'];

export default function LogsPage() {
  const { cwd, setCwd } = useWorkingDir();
  const { register, watch } = useForm({
    defaultValues: {
      runtime: '',
      since: '1h',
      until: '',
      level: '',
      limit: '',
      query: '',
      follow: false,
    },
  });

  const [values, setValues] = useState(() => watch());
  const [agentOptions, setAgentOptions] = useState<Array<{ name: string; path: string }>>([]);
  const [selectedAgentPath, setSelectedAgentPath] = useState('');
  const [hasUserSelectedAgent, setHasUserSelectedAgent] = useState(false);
  useEffect(() => {
    const { unsubscribe } = watch((data) => setValues({ ...data } as any));
    return unsubscribe;
  }, []);
  useEffect(() => {
    let ignore = false;

    const loadAgents = async () => {
      try {
        const res = await fetch('/api/agents');
        const data = await res.json();
        if (!ignore) {
          const options: Array<{ name: string; path: string }> = Array.isArray(data.agents)
            ? data.agents
            : [];
          setAgentOptions(options);
          if (options.length && !selectedAgentPath && !hasUserSelectedAgent) {
            const matched = options.find((agent) => agent.path === cwd);
            if (matched) {
              setSelectedAgentPath(matched.path);
            }
          }
        }
      } catch {
        if (!ignore) {
          setAgentOptions([]);
        }
      }
    };

    loadAgents();
    return () => { ignore = true; };
  }, [cwd, hasUserSelectedAgent]);
  const args = buildLogsArgs(values);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const outputRef = useRef('');
  const abortRef = useRef<AbortController | null>(null);

  const stop = () => {
    abortRef.current?.abort();
    setLoading(false);
  };
  const handleAgentChange = (event: ChangeEvent<HTMLSelectElement>) => {
        const nextPath = event.target.value;
        setSelectedAgentPath(nextPath);
        setHasUserSelectedAgent(true);
        if (nextPath) setCwd(nextPath);
      };
  const run = async () => {
    setLoading(true);
    setOutput('');
    outputRef.current = '';
    abortRef.current = new AbortController();

    if (values.follow) {
      // Streaming mode for --follow
      try {
        const res = await fetch('/api/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ args, cwd }),
          signal: abortRef.current.signal,
        });
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        while (reader) {
          const { value, done } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value).split('\n')) {
            if (!line.startsWith('data: ')) continue;
            try {
              const ev = JSON.parse(line.slice(6));
              if (ev.type === 'stdout' || ev.type === 'stderr') {
                outputRef.current += ev.text;
                setOutput(outputRef.current);
              }
            } catch { /* skip */ }
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') setOutput((o) => o + '\n[Error] ' + err.message);
      }
      setLoading(false);
    } else {
      try {
        const res = await fetch('/api/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ args, cwd }),
          signal: abortRef.current.signal,
        });
        const data = await res.json();
        setOutput(data.stdout + (data.stderr ? '\n[stderr]\n' + data.stderr : ''));
      } catch (err: any) {
        if (err.name !== 'AbortError') setOutput('[Error] ' + err.message);
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Header title="Logs" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Applications *" hint="Choose the application">
              <Select value={selectedAgentPath} onChange={handleAgentChange}>
                <option value="">Select an agent</option>
                {agentOptions.map((agent) => (
                  <option key={agent.path} value={agent.path}>
                    {agent.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Runtime">
              <Input {...register('runtime')} placeholder="MyAgent (all if empty)" />
            </Field>
            <Field label="Log Level">
              <Select {...register('level')}>
                {LOG_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l || '— all levels —'}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Since" hint="e.g. 1h, 30m, 2d or ISO 8601">
              <Input {...register('since')} placeholder="1h" />
            </Field>
            <Field label="Until" hint="e.g. now or ISO 8601">
              <Input {...register('until')} placeholder="now" />
            </Field>
            <Field label="Limit">
              <Input type="number" {...register('limit')} min={1} placeholder="100" />
            </Field>
            <Field label="Search Query">
              <Input {...register('query')} placeholder="timeout" />
            </Field>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('follow')} className="accent-[#FF9900]" />
            <span className="text-sm text-slate-700 dark:text-slate-300">Follow (stream in real-time)</span>
          </label>

          <CommandPreview command={argsToCommand(args)} />

          <div className="flex gap-3">
            <RunButton loading={loading} label="Fetch Logs" loadingLabel="Streaming…" onClick={run} />
            {loading && (
              <button
                onClick={stop}
                className="bg-red-900 hover:bg-red-800 text-red-300 text-sm font-medium px-4 py-2 rounded-md transition-colors"
              >
                Stop
              </button>
            )}
          </div>

          {(output || loading) && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black">
              <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Log Output
                </span>
              </div>
              <div className="p-4 max-h-[60vh] overflow-auto">
                {loading && !output && (
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                    <span className="animate-pulse text-[#FF9900]">●</span> Streaming logs…
                  </div>
                )}
                <pre className="text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap break-words leading-5">
                  {output}
                  {loading && values.follow && <span className="animate-pulse">▌</span>}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
