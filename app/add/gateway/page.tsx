'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Header from '@/components/Header';
import CommandPreview from '@/components/CommandPreview';
import OutputPanel from '@/components/OutputPanel';
import { Field, Input, Select, SectionCard, RunButton } from '@/components/FormParts';
import { useWorkingDir } from '@/components/WorkingDirProvider';
import { buildAddGatewayArgs, argsToCommand } from '@/lib/cli';

export default function AddGatewayPage() {
  const { cwd } = useWorkingDir();
  const { register, watch, handleSubmit } = useForm({
    defaultValues: {
      name: '',
      description: '',
      runtimes: '',
      authorizerType: 'NONE',
      discoveryUrl: '',
      allowedAudience: '',
      allowedClients: '',
      allowedScopes: '',
      clientId: '',
      clientSecret: '',
      idleTimeout: '',
      maxLifetime: '',
    },
  });

  const [values, setValues] = useState(() => watch());
  useEffect(() => {
    const { unsubscribe } = watch((data) => setValues({ ...data } as any));
    return unsubscribe;
  }, []);
  const args = buildAddGatewayArgs(values);
  const authType = values.authorizerType;
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
      <Header title="Add Gateway" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <form onSubmit={handleSubmit(execute)} className="space-y-5">
            <Field label="Gateway Name *">
              <Input {...register('name', { required: true })} placeholder="MyGateway" />
            </Field>

            <Field label="Description">
              <Input {...register('description')} placeholder="Optional description" />
            </Field>

            <Field label="Runtimes" hint="Comma-separated runtime names to expose through this gateway">
              <Input {...register('runtimes')} placeholder="MyAgent,AnotherAgent" />
            </Field>

            <Field label="Authorizer Type">
              <Select {...register('authorizerType')}>
                {['NONE', 'AWS_IAM', 'CUSTOM_JWT'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>

            {authType === 'CUSTOM_JWT' && (
              <SectionCard>
                <p className="text-xs font-semibold text-[#FF9900] uppercase tracking-wider">
                  CUSTOM_JWT Configuration
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Discovery URL">
                    <Input {...register('discoveryUrl')} placeholder="https://idp.example.com/.well-known/openid-configuration" />
                  </Field>
                  <Field label="Allowed Audience">
                    <Input {...register('allowedAudience')} placeholder="my-api" />
                  </Field>
                  <Field label="Allowed Client IDs">
                    <Input {...register('allowedClients')} placeholder="my-client-id" />
                  </Field>
                  <Field label="Allowed Scopes">
                    <Input {...register('allowedScopes')} placeholder="read,write" />
                  </Field>
                  <Field label="Client ID (bearer token)">
                    <Input {...register('clientId')} placeholder="agent-client-id" />
                  </Field>
                  <Field label="Client Secret (bearer token)">
                    <Input type="password" {...register('clientSecret')} />
                  </Field>
                </div>
              </SectionCard>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field label="Idle Timeout (s)">
                <Input type="number" {...register('idleTimeout')} min={0} />
              </Field>
              <Field label="Max Lifetime (s)">
                <Input type="number" {...register('maxLifetime')} min={0} />
              </Field>
            </div>

            <CommandPreview command={argsToCommand(args)} />
            <RunButton loading={loading} label="Add Gateway" loadingLabel="Adding…" />
          </form>

          <OutputPanel output={stdout} error={stderr} exitCode={exitCode} loading={loading} />
        </div>
      </div>
    </div>
  );
}
