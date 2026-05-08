'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Header from '@/components/Header';
import CommandPreview from '@/components/CommandPreview';
import OutputPanel from '@/components/OutputPanel';
import { Field, Input, RunButton, SecondaryButton } from '@/components/FormParts';
import { useWorkingDir } from '@/components/WorkingDirProvider';
import { buildDeployArgs, argsToCommand } from '@/lib/cli';

export default function DeployPage() {
  const { cwd } = useWorkingDir();
  const { register, watch, handleSubmit } = useForm({
    defaultValues: {
      target: '',
      autoConfirm: true,
      verbose: false,
      dryRun: false,
      diff: false,
    },
  });

  const [values, setValues] = useState(() => watch());
  useEffect(() => {
    const { unsubscribe } = watch((data) => setValues({ ...data } as any));
    return unsubscribe;
  }, []);
  const args = buildDeployArgs(values);
  const [stdout, setStdout] = useState('');
  const [stderr, setStderr] = useState('');
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = async (overrideArgs?: string[]) => {
    setLoading(true);
    setStdout(''); setStderr('');
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ args: overrideArgs ?? args, cwd }),
      });
      const data = await res.json();
      setStdout(data.stdout); setStderr(data.stderr); setExitCode(data.exitCode);
    } finally { setLoading(false); }
  };

  const diff = () => {
    const diffArgs = [...buildDeployArgs({ ...values, dryRun: false }), '--diff'];
    execute(diffArgs);
  };

  const dryRun = () => {
    execute(buildDeployArgs({ ...values, dryRun: true, diff: false }));
  };

  return (
    <div className="flex flex-col h-screen">
      <Header title="Deploy" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <form onSubmit={handleSubmit(() => execute())} className="space-y-5">
            <Field label="Target" hint="Deployment target name (default: 'default')">
              <Input {...register('target')} placeholder="default" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'autoConfirm', label: 'Auto-confirm prompts (-y)' },
                { name: 'verbose', label: 'Verbose output (-v)' },
              ].map(({ name, label }) => (
                <label key={name} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register(name as never)} className="accent-[#FF9900]" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
                </label>
              ))}
            </div>

            <CommandPreview command={argsToCommand(args)} />

            <div className="flex gap-3 flex-wrap">
              <RunButton loading={loading} label="Deploy" loadingLabel="Deploying…" />
              <SecondaryButton onClick={dryRun} disabled={loading}>Dry Run</SecondaryButton>
              <SecondaryButton onClick={diff} disabled={loading}>Show CDK Diff</SecondaryButton>
            </div>
          </form>

          <OutputPanel output={stdout} error={stderr} exitCode={exitCode} loading={loading} />
        </div>
      </div>
    </div>
  );
}
