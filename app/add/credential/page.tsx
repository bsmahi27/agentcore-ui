'use client';

import { useState, useEffect, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import Header from '@/components/Header';
import CommandPreview from '@/components/CommandPreview';
import OutputPanel from '@/components/OutputPanel';
import { Field, Input, Select, SectionCard, RunButton } from '@/components/FormParts';
import { useWorkingDir } from '@/components/WorkingDirProvider';
import { buildAddCredentialArgs, argsToCommand } from '@/lib/cli';

export default function AddCredentialPage() {
  const { cwd, setCwd } = useWorkingDir();
  const { register, watch, handleSubmit } = useForm({
    defaultValues: {
      name: '',
      type: 'api-key',
      apiKey: '',
      discoveryUrl: '',
      clientId: '',
      clientSecret: '',
      scopes: '',
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

  const args = buildAddCredentialArgs(values);
  const credType = values.type;
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
      <Header title="Add Credential" />
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

            <Field label="Credential Name *">
              <Input {...register('name', { required: true })} placeholder="MyCredential" />
            </Field>

            <Field label="Credential Type">
              <div className="flex gap-4">
                {['api-key', 'oauth'].map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value={t} {...register('type')} className="accent-[#FF9900]" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{t === 'api-key' ? 'API Key' : 'OAuth 2.0'}</span>
                  </label>
                ))}
              </div>
            </Field>

            {credType === 'api-key' ? (
              <Field label="API Key Value">
                <Input type="password" {...register('apiKey')} placeholder="sk-…" />
              </Field>
            ) : (
              <SectionCard>
                <p className="text-xs font-semibold text-[#FF9900] uppercase tracking-wider">OAuth Configuration</p>
                <Field label="Discovery URL">
                  <Input {...register('discoveryUrl')} placeholder="https://idp.example.com/.well-known/openid-configuration" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Client ID">
                    <Input {...register('clientId')} placeholder="my-client-id" />
                  </Field>
                  <Field label="Client Secret">
                    <Input type="password" {...register('clientSecret')} />
                  </Field>
                </div>
                <Field label="Scopes" hint="Comma-separated">
                  <Input {...register('scopes')} placeholder="read,write" />
                </Field>
              </SectionCard>
            )}

            <CommandPreview command={argsToCommand(args)} />
            <RunButton loading={loading} label="Add Credential" loadingLabel="Adding…" />
          </form>

          <OutputPanel output={stdout} error={stderr} exitCode={exitCode} loading={loading} />
        </div>
      </div>
    </div>
  );
}
