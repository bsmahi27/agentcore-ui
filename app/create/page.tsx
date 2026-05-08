'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Header from '@/components/Header';
import CommandPreview from '@/components/CommandPreview';
import OutputPanel from '@/components/OutputPanel';
import {
  Field,
  Input,
  Select,
  SectionCard,
  RunButton,
  SecondaryButton,
} from '@/components/FormParts';
import { useWorkingDir } from '@/components/WorkingDirProvider';
import { buildCreateArgs, argsToCommand } from '@/lib/cli';

const FRAMEWORKS = ['Strands', 'LangChain_LangGraph', 'GoogleADK', 'OpenAIAgents'];
const PROVIDERS = ['Bedrock', 'Anthropic', 'OpenAI', 'Gemini'];
const MEMORY = ['none', 'shortTerm', 'longAndShortTerm'];
const BUILDS = ['CodeZip', 'Container'];
const PROTOCOLS = ['HTTP', 'MCP', 'A2A'];

export default function CreatePage() {
  const { cwd } = useWorkingDir();
  const {
    register,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: 'onChange',
    defaultValues: {
      name: '',
      type: 'create',
      framework: 'Strands',
      modelProvider: 'Bedrock',
      memory: 'none',
      build: 'CodeZip',
      protocol: 'HTTP',
      networkMode: 'PUBLIC',
      subnets: '',
      securityGroups: '',
      agentId: '',
      agentAliasId: '',
      region: '',
      outputDir: '',
      apiKey: '',
      idleTimeout: '',
      maxLifetime: '',
      skipGit: false,
      skipPythonSetup: false,
      skipInstall: false,
      noAgent: false,
      dryRun: false,
    },
  });

  const [liveValues, setLiveValues] = useState(() => watch());
  useEffect(() => {
    const { unsubscribe } = watch((data) => setLiveValues({ ...data } as any));
    return unsubscribe;
  }, []);
  const args = buildCreateArgs(liveValues);

  const networkMode = liveValues.networkMode;
  const projectType = liveValues.type;
  const modelProvider = liveValues.modelProvider;
  const [stdout, setStdout] = useState('');
  const [stderr, setStderr] = useState('');
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = async (overrideArgs?: string[]) => {
    setLoading(true);
    setStdout('');
    setStderr('');
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ args: overrideArgs ?? args, cwd }),
      });
      const data = await res.json();
      setStdout(data.stdout);
      setStderr(data.stderr);
      setExitCode(data.exitCode);
    } finally {
      setLoading(false);
    }
  };

  const dryRun = () => {
    const dryArgs = [...args.filter((a) => a !== '--dry-run'), '--dry-run'];
    execute(dryArgs);
  };

  return (
    <div className="flex flex-col h-screen">
      <Header title="Create Project" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <form onSubmit={handleSubmit(() => execute())} className="space-y-5">
            {/* Name */}
            <Field
              label="Project Name *"
              hint="Starts with a letter, alphanumeric only, max 23 chars"
              error={
                errors.name?.type === 'required' ? 'Name is required' :
                errors.name?.type === 'maxLength' ? 'Max 23 characters' :
                errors.name?.type === 'pattern' ? 'Letters and numbers only, must start with a letter' :
                undefined
              }
            >
              <Input
                {...register('name', {
                  required: true,
                  maxLength: 23,
                  pattern: /^[a-zA-Z][a-zA-Z0-9]*$/,
                })}
                placeholder="MyProject"
              />
            </Field>

            {/* Type */}
            <Field label="Project Type">
              <div className="flex gap-4">
                {['create', 'import'].map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value={t}
                      {...register('type')}
                      className="accent-[#FF9900]"
                    />
                    <span className="text-sm text-slate-300 capitalize">{t}</span>
                  </label>
                ))}
              </div>
            </Field>

            {/* Import-specific */}
            {projectType === 'import' && (
              <SectionCard>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Agent ID">
                    <Input {...register('agentId')} placeholder="AGENT123" />
                  </Field>
                  <Field label="Agent Alias ID">
                    <Input {...register('agentAliasId')} placeholder="ALIAS456" />
                  </Field>
                  <Field label="Region">
                    <Input {...register('region')} placeholder="us-east-1" />
                  </Field>
                </div>
              </SectionCard>
            )}

            {/* Framework + Provider */}
            <div className="grid grid-cols-2 gap-6">
              <Field label="Framework">
                <Select {...register('framework')}>
                  {FRAMEWORKS.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Model Provider">
                <Select {...register('modelProvider')}>
                  {PROVIDERS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </Select>
              </Field>
            </div>

            {/* API key for non-Bedrock */}
            {modelProvider !== 'Bedrock' && (
              <Field label="API Key">
                <Input type="password" {...register('apiKey')} placeholder="sk-…" />
              </Field>
            )}

            {/* Memory + Build + Protocol */}
            <div className="grid grid-cols-3 gap-4">
              <Field label="Memory">
                <Select {...register('memory')}>
                  {MEMORY.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Build">
                <Select {...register('build')}>
                  {BUILDS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Protocol">
                <Select {...register('protocol')}>
                  {PROTOCOLS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </Select>
              </Field>
            </div>

            {/* Network Mode */}
            <Field label="Network Mode">
              <div className="flex gap-4 mb-3">
                {['PUBLIC', 'VPC'].map((m) => (
                  <label key={m} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value={m}
                      {...register('networkMode')}
                      className="accent-[#FF9900]"
                    />
                    <span className="text-sm text-slate-300">{m}</span>
                  </label>
                ))}
              </div>
              {networkMode === 'VPC' && (
                <SectionCard>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Subnet IDs">
                      <Input
                        {...register('subnets')}
                        placeholder="subnet-abc,subnet-def"
                      />
                    </Field>
                    <Field label="Security Group IDs">
                      <Input {...register('securityGroups')} placeholder="sg-123" />
                    </Field>
                  </div>
                </SectionCard>
              )}
            </Field>

            {/* Optional */}
            <div className="grid grid-cols-3 gap-4">
              <Field label="Output Directory">
                <Input {...register('outputDir')} placeholder="./projects" />
              </Field>
              <Field label="Idle Timeout (s)">
                <Input type="number" {...register('idleTimeout')} min={0} />
              </Field>
              <Field label="Max Lifetime (s)">
                <Input type="number" {...register('maxLifetime')} min={0} />
              </Field>
            </div>

            {/* Flags */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'skipGit', label: 'Skip git init' },
                { name: 'skipPythonSetup', label: 'Skip Python venv setup' },
                { name: 'skipInstall', label: 'Skip dependency install' },
                { name: 'noAgent', label: 'Project only (--no-agent)' },
              ].map(({ name, label }) => (
                <label key={name} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register(name as never)}
                    className="accent-[#FF9900]"
                  />
                  <span className="text-sm text-slate-300">{label}</span>
                </label>
              ))}
            </div>

            <CommandPreview command={argsToCommand(args)} />

            <div className="flex gap-3">
              <RunButton loading={loading} label="Create Project" loadingLabel="Creating…" />
              <SecondaryButton onClick={dryRun} disabled={loading}>
                Dry Run
              </SecondaryButton>
            </div>
          </form>

          <OutputPanel output={stdout} error={stderr} exitCode={exitCode} loading={loading} />
        </div>
      </div>
    </div>
  );
}
