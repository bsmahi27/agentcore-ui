'use client';

import { useState, useEffect, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import Header from '@/components/Header';
import CommandPreview from '@/components/CommandPreview';
import OutputPanel from '@/components/OutputPanel';
import { Field, Input, Select, RunButton } from '@/components/FormParts';
import { useWorkingDir } from '@/components/WorkingDirProvider';
import { buildAddEvaluatorArgs, argsToCommand } from '@/lib/cli';

const RATING_SCALES = ['1-5-quality', '1-3-simple', 'pass-fail', 'good-neutral-bad', 'custom'];

export default function AddEvaluatorPage() {
  const { cwd, setCwd } = useWorkingDir();
  const { register, watch, handleSubmit } = useForm({
    defaultValues: {
      name: '',
      level: 'SESSION',
      model: 'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
      instructions: '',
      ratingScale: '1-5-quality',
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

  const args = buildAddEvaluatorArgs(values);
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
      const targetCwd = selectedAgentPath || cwd;
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ args, cwd: targetCwd }),
      });
      const data = await res.json();
      setStdout(data.stdout); setStderr(data.stderr); setExitCode(data.exitCode);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-screen">
      <Header title="Add Evaluator" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
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

            <Field label="Evaluator Name *">
              <Input {...register('name', { required: true })} placeholder="ResponseQuality" />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Evaluation Level">
                <Select {...register('level')}>
                  {['SESSION', 'TRACE', 'TOOL_CALL'].map((l) => <option key={l}>{l}</option>)}
                </Select>
              </Field>
              <Field label="Rating Scale">
                <Select {...register('ratingScale')}>
                  {RATING_SCALES.map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
            </div>

            <Field label="Bedrock Model ID">
              <Input {...register('model')} placeholder="global.anthropic.claude-sonnet-4-5-20250929-v1:0" />
            </Field>

            <Field
              label="Evaluation Instructions"
              hint="Use {context} as a placeholder for agent context"
            >
              <textarea
                {...register('instructions')}
                rows={4}
                placeholder="Evaluate the response quality on a scale of 1-5. Context: {context}"
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-[#FF9900] placeholder-slate-400 dark:placeholder-slate-500 resize-y"
              />
            </Field>

            <CommandPreview command={argsToCommand(args)} />
            <RunButton loading={loading} label="Add Evaluator" loadingLabel="Adding…" />
          </form>

          <OutputPanel output={stdout} error={stderr} exitCode={exitCode} loading={loading} />
        </div>
      </div>
    </div>
  );
}
