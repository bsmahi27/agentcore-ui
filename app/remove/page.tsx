'use client';

import { useState, useEffect, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import Header from '@/components/Header';
import CommandPreview from '@/components/CommandPreview';
import OutputPanel from '@/components/OutputPanel';
import { Field, Input, Select, RunButton } from '@/components/FormParts';
import { useWorkingDir } from '@/components/WorkingDirProvider';
import { buildRemoveArgs, argsToCommand } from '@/lib/cli';

const RESOURCE_TYPES = [
  'agent tools',
  'memory',
  'credential',
  'evaluator',
  'online-eval',
  'gateway',
  'gateway-target',
  'all',
];

export default function RemovePage() {
  const { cwd, setCwd } = useWorkingDir();
  const { register, watch, handleSubmit } = useForm({
    defaultValues: {
      resourceType: 'agent',
      name: '',
      autoConfirm: false,
      dryRun: false,
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
  const args = buildRemoveArgs(values);
  const resourceType = values.resourceType;
  const [stdout, setStdout] = useState('');
  const [stderr, setStderr] = useState('');
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAgentChange = (event: ChangeEvent<HTMLSelectElement>) => {
          const nextPath = event.target.value;
        setSelectedAgentPath(nextPath);
        setHasUserSelectedAgent(true);
        if (nextPath) setCwd(nextPath);
      };

  const execute = async () => {
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
      <Header title="Remove" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-start gap-3 p-3 bg-red-950 border border-red-800 rounded-lg">
            <span className="text-red-400 text-lg leading-none">⚠</span>
            <p className="text-sm text-red-300">
              This command removes resources from the project. Use <strong>Dry Run</strong> first
              to preview what will be removed.
            </p>
          </div>

          <form onSubmit={handleSubmit(execute)} className="space-y-5">
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
            <Field label="Resource Type">
              <Select {...register('resourceType')}>
                {RESOURCE_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>

            {resourceType !== 'all' && (
              <Field label="Resource Name *">
                <Input
                  {...register('name', { required: resourceType !== 'all' })}
                  placeholder="MyAgent"
                />
              </Field>
            )}

            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('autoConfirm')} className="accent-[#FF9900]" />
                <span className="text-sm text-slate-700 dark:text-slate-300">Auto-confirm (-y)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('dryRun')} className="accent-[#FF9900]" />
                <span className="text-sm text-slate-700 dark:text-slate-300">Dry run (preview only)</span>
              </label>
            </div>

            <CommandPreview command={argsToCommand(args)} />

            <RunButton
              loading={loading}
              label={`Remove ${resourceType !== 'all' ? resourceType : 'All'}`}
              loadingLabel="Removing…"
            />
          </form>

          <OutputPanel output={stdout} error={stderr} exitCode={exitCode} loading={loading} />
        </div>
      </div>
    </div>
  );
}
