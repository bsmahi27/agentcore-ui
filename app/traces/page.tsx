'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Header from '@/components/Header';
import CommandPreview from '@/components/CommandPreview';
import OutputPanel from '@/components/OutputPanel';
import { Field, Input, RunButton } from '@/components/FormParts';
import { useWorkingDir } from '@/components/WorkingDirProvider';
import { buildTracesListArgs, argsToCommand } from '@/lib/cli';

export default function TracesPage() {
  const { cwd } = useWorkingDir();
  const { register, watch } = useForm({
    defaultValues: {
      runtime: '',
      limit: '20',
      since: '12h',
      until: '',
    },
  });

  const [traceId, setTraceId] = useState('');
  const [values, setValues] = useState(() => watch());
  useEffect(() => {
    const { unsubscribe } = watch((data) => setValues({ ...data } as any));
    return unsubscribe;
  }, []);
  const listArgs = buildTracesListArgs(values);
  const getArgs = traceId.trim()
    ? ['traces', 'get', traceId.trim(), ...(values.runtime ? ['--runtime', values.runtime] : [])]
    : [];

  const [stdout, setStdout] = useState('');
  const [stderr, setStderr] = useState('');
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = async (args: string[]) => {
    setLoading(true);
    setStdout(''); setStderr('');
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ args, cwd }),
      });
      const data = await res.json();
      setStdout(data.stdout); setStderr(data.stderr); setExitCode(data.exitCode);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-screen">
      <Header title="Traces" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* List Traces */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              List Traces
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Runtime">
                <Input {...register('runtime')} placeholder="MyAgent (all if empty)" />
              </Field>
              <Field label="Limit">
                <Input type="number" {...register('limit')} min={1} max={100} />
              </Field>
              <Field label="Since" hint="e.g. 12h, 1d or ISO 8601">
                <Input {...register('since')} placeholder="12h" />
              </Field>
              <Field label="Until">
                <Input {...register('until')} placeholder="now" />
              </Field>
            </div>
            <CommandPreview command={argsToCommand(listArgs)} />
            <RunButton
              loading={loading}
              label="List Traces"
              loadingLabel="Loading…"
              onClick={() => execute(listArgs)}
            />
          </div>

          {/* Get Specific Trace */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Get Trace Details
            </h2>
            <Field label="Trace ID">
              <Input
                value={traceId}
                onChange={(e) => setTraceId(e.target.value)}
                placeholder="abc123def456…"
              />
            </Field>
            {getArgs.length > 0 && <CommandPreview command={argsToCommand(getArgs)} />}
            <RunButton
              loading={loading}
              label="Get Trace"
              loadingLabel="Loading…"
              onClick={() => getArgs.length && execute(getArgs)}
              disabled={!traceId.trim()}
            />
          </div>

          <OutputPanel output={stdout} error={stderr} exitCode={exitCode} loading={loading} />
        </div>
      </div>
    </div>
  );
}
