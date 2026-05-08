'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Header from '@/components/Header';
import CommandPreview from '@/components/CommandPreview';
import OutputPanel from '@/components/OutputPanel';
import { Field, Input, Select, RunButton } from '@/components/FormParts';
import { useWorkingDir } from '@/components/WorkingDirProvider';
import { buildAddMemoryArgs, argsToCommand } from '@/lib/cli';

const STRATEGIES = ['SEMANTIC', 'SUMMARIZATION', 'USER_PREFERENCE', 'EPISODIC'];
const CONTENT_LEVELS = ['FULL_CONTENT', 'METADATA_ONLY'];

export default function AddMemoryPage() {
  const { cwd } = useWorkingDir();
  const { register, watch, handleSubmit } = useForm({
    defaultValues: {
      name: '',
      strategies: [] as string[],
      expiry: '30',
      deliveryType: 'kinesis',
      dataStreamArn: '',
      streamContentLevel: 'FULL_CONTENT',
    },
  });

  const [values, setValues] = useState(() => watch());
  useEffect(() => {
    const { unsubscribe } = watch((data) => setValues({ ...data } as any));
    return unsubscribe;
  }, []);
  const args = buildAddMemoryArgs(values);
  const [stdout, setStdout] = useState('');
  const [stderr, setStderr] = useState('');
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

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
      <Header title="Add Memory" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <form onSubmit={handleSubmit(execute)} className="space-y-5">
            <Field label="Memory Name *">
              <Input {...register('name', { required: true })} placeholder="SharedMemory" />
            </Field>

            <Field label="Strategies" hint="Select one or more memory strategy types">
              <div className="flex flex-wrap gap-3 mt-1">
                {STRATEGIES.map((s) => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      value={s}
                      {...register('strategies')}
                      className="accent-[#FF9900]"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{s}</span>
                  </label>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Expiry (days)" hint="7–365, default 30">
                <Input type="number" {...register('expiry')} min={7} max={365} />
              </Field>
              <Field label="Delivery Type">
                <Input {...register('deliveryType')} placeholder="kinesis" />
              </Field>
              <Field label="Stream Content Level">
                <Select {...register('streamContentLevel')}>
                  {CONTENT_LEVELS.map((l) => <option key={l}>{l}</option>)}
                </Select>
              </Field>
            </div>

            <Field label="Kinesis Data Stream ARN">
              <Input {...register('dataStreamArn')} placeholder="arn:aws:kinesis:…" />
            </Field>

            <CommandPreview command={argsToCommand(args)} />
            <RunButton loading={loading} label="Add Memory" loadingLabel="Adding…" />
          </form>

          <OutputPanel output={stdout} error={stderr} exitCode={exitCode} loading={loading} />
        </div>
      </div>
    </div>
  );
}
