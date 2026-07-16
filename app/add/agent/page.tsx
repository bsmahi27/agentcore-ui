'use client';

import { useState, useEffect, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import Header from '@/components/Header';
import CommandPreview from '@/components/CommandPreview';
import OutputPanel from '@/components/OutputPanel';
import { Field, Input, Select, SectionCard, RunButton } from '@/components/FormParts';
import { useWorkingDir } from '@/components/WorkingDirProvider';
import { buildAddAgentArgs, argsToCommand } from '@/lib/cli';

const FRAMEWORKS = ['Strands', 'LangChain_LangGraph', 'GoogleADK', 'OpenAIAgents'];
const PROVIDERS = ['Bedrock', 'Anthropic', 'OpenAI', 'Gemini'];
const MEMORY = ['none', 'shortTerm', 'longAndShortTerm'];
const PROTOCOLS = ['HTTP', 'MCP', 'A2A'];
const BUILDS = ['CodeZip', 'Container'];
const LANGUAGES = ['Python', 'TypeScript', 'Other'];

const FRAMEWORK_TO_PROVIDER: Record<string, string> = {
  Strands: 'Bedrock',
  LangChain_LangGraph: 'Anthropic',
  GoogleADK: 'Gemini',
  OpenAIAgents: 'OpenAI',
};
 
const PROVIDER_TO_FRAMEWORK: Record<string, string> = {
  Bedrock: 'Strands',
  Anthropic: 'LangChain_LangGraph',
  Gemini: 'GoogleADK',
  OpenAI: 'OpenAIAgents',
};


export default function AddAgentPage() {
  const { cwd, setCwd } = useWorkingDir();
  const { register, watch, handleSubmit,setValue, formState: { errors } } = useForm({
    mode: 'onChange',
    defaultValues: {
      name: '',
      type: 'create',
      framework: 'Strands',
      modelProvider: 'Bedrock',
      memory: 'none',
      protocol: 'HTTP',
      build: 'CodeZip',
      language: 'Python',
      codeLocation: '',
      entrypoint: 'main.py',
      networkMode: 'PUBLIC',
      subnets: '',
      securityGroups: '',
      agentId: '',
      agentAliasId: '',
      region: '',
      apiKey: '',
      idleTimeout: '',
      maxLifetime: '',
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


const selectedFramework = watch('framework');
  const selectedProvider = watch('modelProvider');
 
  // When framework changes → auto-update provider
  useEffect(() => {
    const defaultProvider = FRAMEWORK_TO_PROVIDER[selectedFramework];
    if (defaultProvider) {
      setValue('modelProvider', defaultProvider);
    }
  }, [selectedFramework]);
 
  // When provider changes → auto-update framework
  useEffect(() => {
    const defaultFramework = PROVIDER_TO_FRAMEWORK[selectedProvider];
    if (defaultFramework) {
      setValue('framework', defaultFramework);
    }
  }, [selectedProvider]);


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

  const args = buildAddAgentArgs(values);
  const agentType = values.type;
  const networkMode = values.networkMode;
  const modelProvider = values.modelProvider;
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
      <Header title="Agent" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <form onSubmit={handleSubmit(execute)} className="space-y-5">
            <Field label="Applications *" hint="Choose the application">
              <Select value={selectedAgentPath} onChange={handleAgentChange}>
                <option value="">Select an application</option>
                {agentOptions.map((agent) => (
                  <option key={agent.path} value={agent.path}>
                    {agent.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Agent Name *"
              hint="Starts with a letter, alphanumeric + underscores, max 48 chars"
              error={
                errors.name?.type === 'required' ? 'Name is required' :
                errors.name?.type === 'maxLength' ? 'Max 48 characters' :
                errors.name?.type === 'pattern' ? 'Letters, numbers and underscores only, must start with a letter' :
                undefined
              }
            >
              <Input
                {...register('name', { required: true, maxLength: 48, pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/ })}
                placeholder="MyAgent"
              />
            </Field>

            <Field label="Agent Type">
              <div className="flex gap-4">
                {['create', 'byo', 'import'].map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value={t} {...register('type')} className="accent-[#FF9900]" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{t === 'byo' ? 'Bring Your Own' : t.charAt(0).toUpperCase() + t.slice(1)}</span>
                  </label>
                ))}
              </div>
            </Field>

            {agentType === 'byo' && (
              <SectionCard>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Code Location">
                    <Input {...register('codeLocation')} placeholder="./my-agent" />
                  </Field>
                  <Field label="Entrypoint">
                    <Input {...register('entrypoint')} placeholder="main.py" />
                  </Field>
                </div>
                <Field label="Language">
                  <Select {...register('language')}>
                    {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
                  </Select>
                </Field>
              </SectionCard>
            )}

            {agentType === 'import' && (
              <SectionCard>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Agent ID"><Input {...register('agentId')} placeholder="AGENT123" /></Field>
                  <Field label="Agent Alias ID"><Input {...register('agentAliasId')} placeholder="ALIAS456" /></Field>
                  <Field label="Region"><Input {...register('region')} placeholder="us-east-1" /></Field>
                </div>
              </SectionCard>
            )}

            {agentType === 'create' && (
              <div className="grid grid-cols-3 gap-4">
                <Field label="Framework">
                  <Select {...register('framework')}>
                    {FRAMEWORKS.map((f) => <option key={f}>{f}</option>)}
                  </Select>
                </Field>
                <Field label="Model Provider">
                  <Select {...register('modelProvider')}>
                    {PROVIDERS.map((p) => <option key={p}>{p}</option>)}
                  </Select>
                </Field>
                <Field label="Language">
                  <Select {...register('language')}>
                    {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
                  </Select>
                </Field>
              </div>
            )}

            {modelProvider !== 'Bedrock' && agentType === 'create' && (
              <Field label="API Key">
                <Input type="password" {...register('apiKey')} placeholder="sk-…" />
              </Field>
            )}

            <div className="grid grid-cols-3 gap-4">
              <Field label="Memory">
                <Select {...register('memory')}>{MEMORY.map((m) => <option key={m}>{m}</option>)}</Select>
              </Field>
              <Field label="Protocol">
                <Select {...register('protocol')}>{PROTOCOLS.map((p) => <option key={p}>{p}</option>)}</Select>
              </Field>
              <Field label="Build">
                <Select {...register('build')}>{BUILDS.map((b) => <option key={b}>{b}</option>)}</Select>
              </Field>
            </div>

            <Field label="Network Mode">
              <div className="flex gap-4 mb-3">
                {['PUBLIC', 'VPC'].map((m) => (
                  <label key={m} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value={m} {...register('networkMode')} className="accent-[#FF9900]" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{m}</span>
                  </label>
                ))}
              </div>
              {networkMode === 'VPC' && (
                <SectionCard>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Subnet IDs"><Input {...register('subnets')} placeholder="subnet-abc,subnet-def" /></Field>
                    <Field label="Security Group IDs"><Input {...register('securityGroups')} placeholder="sg-123" /></Field>
                  </div>
                </SectionCard>
              )}
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Idle Timeout (s)"><Input type="number" {...register('idleTimeout')} min={0} /></Field>
              <Field label="Max Lifetime (s)"><Input type="number" {...register('maxLifetime')} min={0} /></Field>
            </div>

            <CommandPreview command={argsToCommand(args)} />
            <RunButton loading={loading} label="Agent Tools" loadingLabel="Adding…" />
          </form>

          <OutputPanel output={stdout} error={stderr} exitCode={exitCode} loading={loading} />
        </div>
      </div>
    </div>
  );
}

/*
// 'use client';
 
// import { useState, useEffect } from 'react';
// import { useForm } from 'react-hook-form';
// import Header from '@/components/Header';
// import CommandPreview from '@/components/CommandPreview';
// import OutputPanel from '@/components/OutputPanel';
// import { Field, Input, Select, SectionCard, RunButton } from '@/components/FormParts';
// import { useWorkingDir } from '@/components/WorkingDirProvider';
// import { buildAddAgentArgs, argsToCommand } from '@/lib/cli';
 
// const FRAMEWORKS = ['Strands', 'LangChain_LangGraph', 'GoogleADK', 'OpenAIAgents'];
// const PROVIDERS = ['Bedrock', 'Anthropic', 'OpenAI', 'Gemini'];
// const MEMORY = ['none', 'shortTerm', 'longAndShortTerm'];
// const PROTOCOLS = ['HTTP', 'MCP', 'A2A'];
// const BUILDS = ['CodeZip', 'Container'];
// const LANGUAGES = ['Python', 'TypeScript', 'Other'];
 
// const FRAMEWORK_TO_PROVIDER: Record<string, string> = {
//   Strands: 'Bedrock',
//   LangChain_LangGraph: 'Anthropic',
//   GoogleADK: 'Gemini',
//   OpenAIAgents: 'OpenAI',
// };
 
// const PROVIDER_TO_FRAMEWORK: Record<string, string> = {
//   Bedrock: 'Strands',
//   Anthropic: 'LangChain_LangGraph',
//   Gemini: 'GoogleADK',
//   OpenAI: 'OpenAIAgents',
// };
 
// export default function AddAgentPage() {
//   const { cwd } = useWorkingDir();
//   const { register, watch, handleSubmit, setValue, formState: { errors } } = useForm({
//     mode: 'onChange',
//     defaultValues: {
//       project: '',
//       name: '',
//       type: 'create',
//       framework: 'Strands',
//       modelProvider: 'Bedrock',
//       memory: 'none',
//       protocol: 'HTTP',
//       build: 'CodeZip',
//       language: 'Python',
//       codeLocation: '',
//       entrypoint: 'main.py',
//       networkMode: 'PUBLIC',
//       subnets: '',
//       securityGroups: '',
//       agentId: '',
//       agentAliasId: '',
//       region: '',
//       apiKey: '',
//       idleTimeout: '',
//       maxLifetime: '',
//     },
//   });
 
//   const [values, setValues] = useState(() => watch());
//   useEffect(() => {
//     const { unsubscribe } = watch((data) => setValues({ ...data } as any));
//     return unsubscribe;
//   }, []);
 
//   // Fetch projects from generated_agents folder
//   const [projects, setProjects] = useState<string[]>([]);
//   useEffect(() => {
//     fetch('/api/list-projects')
//       .then((r) => r.json())
//       .then((d) => setProjects(d.projects || []))
//       .catch(() => setProjects([]));
//   }, []);
 
//   const selectedFramework = watch('framework');
//   const selectedProvider = watch('modelProvider');
 
//   // When framework changes → auto-update provider
//   useEffect(() => {
//     const defaultProvider = FRAMEWORK_TO_PROVIDER[selectedFramework];
//     if (defaultProvider) {
//       setValue('modelProvider', defaultProvider);
//     }
//   }, [selectedFramework]);
 
//   // When provider changes → auto-update framework
//   useEffect(() => {
//     const defaultFramework = PROVIDER_TO_FRAMEWORK[selectedProvider];
//     if (defaultFramework) {
//       setValue('framework', defaultFramework);
//     }
//   }, [selectedProvider]);
 
//   const args = buildAddAgentArgs(values);
//   const agentType = values.type;
//   const networkMode = values.networkMode;
//   const modelProvider = selectedProvider;
//   const [stdout, setStdout] = useState('');
//   const [stderr, setStderr] = useState('');
//   const [exitCode, setExitCode] = useState<number | null>(null);
//   const [loading, setLoading] = useState(false);
 
//   const execute = async () => {
//     setLoading(true);
//     setStdout(''); setStderr('');
//     try {
//       const res = await fetch('/api/run', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           args,
//           cwd,
//           agentdirectory: values.project
//             ? `generated_agents/${values.project}`
//             : undefined,
//         }),
//       });
//       const data = await res.json();
//       setStdout(data.stdout); setStderr(data.stderr); setExitCode(data.exitCode);
//     } finally { setLoading(false); }
//   };
 
//   return (
//     <div className="flex flex-col h-screen">
//       <Header title="Add Agent" />
//       <div className="flex-1 overflow-auto p-6">
//         <div className="max-w-3xl mx-auto space-y-6">
//           <form onSubmit={handleSubmit(execute)} className="space-y-5">
 
//             {/* Available Agents dropdown */
//             <Field label="Available Agents *">
//               <select
//                 {...register('project', { required: true })}
//                 className="w-full px-3 py-2 rounded-md border border-slate-600 bg-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9900]"
//               >
//                 <option value="">-- Select Project --</option>
//                 {projects.map((p) => (
//                   <option key={p} value={p}>{p}</option>
//                 ))}
//               </select>
//             </Field>
 
//             <Field
//               label="Agent Name *"
//               hint="Starts with a letter, alphanumeric + underscores, max 48 chars"
//               error={
//                 errors.name?.type === 'required' ? 'Name is required' :
//                 errors.name?.type === 'maxLength' ? 'Max 48 characters' :
//                 errors.name?.type === 'pattern' ? 'Letters, numbers and underscores only, must start with a letter' :
//                 undefined
//               }
//             >
//               <Input
//                 {...register('name', { required: true, maxLength: 48, pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/ })}
//                 placeholder="MyAgent"
//               />
//             </Field>
 
//             <Field label="Agent Type">
//               <div className="flex gap-4">
//                 {['create', 'byo', 'import'].map((t) => (
//                   <label key={t} className="flex items-center gap-2 cursor-pointer">
//                     <input type="radio" value={t} {...register('type')} className="accent-[#FF9900]" />
//                     <span className="text-sm text-slate-700 dark:text-slate-300">{t === 'byo' ? 'Bring Your Own' : t.charAt(0).toUpperCase() + t.slice(1)}</span>
//                   </label>
//                 ))}
//               </div>
//             </Field>
 
//             {agentType === 'byo' && (
//               <SectionCard>
//                 <div className="grid grid-cols-2 gap-3">
//                   <Field label="Code Location">
//                     <Input {...register('codeLocation')} placeholder="./my-agent" />
//                   </Field>
//                   <Field label="Entrypoint">
//                     <Input {...register('entrypoint')} placeholder="main.py" />
//                   </Field>
//                 </div>
//                 <Field label="Language">
//                   <Select {...register('language')}>
//                     {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
//                   </Select>
//                 </Field>
//               </SectionCard>
//             )}
 
//             {agentType === 'import' && (
//               <SectionCard>
//                 <div className="grid grid-cols-3 gap-3">
//                   <Field label="Agent ID"><Input {...register('agentId')} placeholder="AGENT123" /></Field>
//                   <Field label="Agent Alias ID"><Input {...register('agentAliasId')} placeholder="ALIAS456" /></Field>
//                   <Field label="Region"><Input {...register('region')} placeholder="us-east-1" /></Field>
//                 </div>
//               </SectionCard>
//             )}
 
//             {agentType === 'create' && (
//               <div className="grid grid-cols-2 gap-4">
//                 <Field label="Framework">
//                   <Select {...register('framework')}>
//                     {FRAMEWORKS.map((f) => <option key={f}>{f}</option>)}
//                   </Select>
//                 </Field>
//                 <Field label="Model Provider">
//                   <Select {...register('modelProvider')}>
//                     {PROVIDERS.map((p) => <option key={p}>{p}</option>)}
//                   </Select>
//                 </Field>
//               </div>
//             )}
 
//             {modelProvider !== 'Bedrock' && agentType === 'create' && (
//               <Field label="API Key">
//                 <Input type="password" {...register('apiKey')} placeholder="sk-…" />
//               </Field>
//             )}
 
//             <div className="grid grid-cols-3 gap-4">
//               <Field label="Memory">
//                 <Select {...register('memory')}>{MEMORY.map((m) => <option key={m}>{m}</option>)}</Select>
//               </Field>
//               <Field label="Protocol">
//                 <Select {...register('protocol')}>{PROTOCOLS.map((p) => <option key={p}>{p}</option>)}</Select>
//               </Field>
//               <Field label="Build">
//                 <Select {...register('build')}>{BUILDS.map((b) => <option key={b}>{b}</option>)}</Select>
//               </Field>
//             </div>
 
//             <Field label="Network Mode">
//               <div className="flex gap-4 mb-3">
//                 {['PUBLIC', 'VPC'].map((m) => (
//                   <label key={m} className="flex items-center gap-2 cursor-pointer">
//                     <input type="radio" value={m} {...register('networkMode')} className="accent-[#FF9900]" />
//                     <span className="text-sm text-slate-700 dark:text-slate-300">{m}</span>
//                   </label>
//                 ))}
//               </div>
//               {networkMode === 'VPC' && (
//                 <SectionCard>
//                   <div className="grid grid-cols-2 gap-3">
//                     <Field label="Subnet IDs"><Input {...register('subnets')} placeholder="subnet-abc,subnet-def" /></Field>
//                     <Field label="Security Group IDs"><Input {...register('securityGroups')} placeholder="sg-123" /></Field>
//                   </div>
//                 </SectionCard>
//               )}
//             </Field>
 
//             <div className="grid grid-cols-2 gap-4">
//               <Field label="Idle Timeout (s)"><Input type="number" {...register('idleTimeout')} min={0} /></Field>
//               <Field label="Max Lifetime (s)"><Input type="number" {...register('maxLifetime')} min={0} /></Field>
//             </div>
 
//             <CommandPreview command={argsToCommand(args)} />
//             <RunButton loading={loading} label="Add Agent" loadingLabel="Adding…" />
//           </form>
 
//           <OutputPanel output={stdout} error={stderr} exitCode={exitCode} loading={loading} />
//         </div>
//       </div>
//     </div>
//   );
// }
