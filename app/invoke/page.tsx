'use client';

import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import Header from '@/components/Header';
import CommandPreview from '@/components/CommandPreview';
import { Field, Input, RunButton, Select } from '@/components/FormParts';
import { useWorkingDir } from '@/components/WorkingDirProvider';
import { buildInvokeArgs, argsToCommand } from '@/lib/cli';

export default function InvokePage() {
  const { cwd, setCwd } = useWorkingDir();
  const { register, watch } = useForm({
    defaultValues: {
      prompt: '',
      runtime: '',
      target: '',
      sessionId: '',
      userId: '',
      stream: false,
      bearerToken: '',
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
  const args = buildInvokeArgs(values);
  const [output, setOutput] = useState('');
  const [exitCode, setExitCode] = useState<number | null>(null);
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
    if (!values.prompt.trim()) return;
    setLoading(true);
    setOutput('');
    setExitCode(null);
    outputRef.current = '';
    abortRef.current = new AbortController();

    if (values.stream) {
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
              } else if (ev.type === 'exit') {
                setExitCode(parseInt(ev.text, 10));
              }
            } catch { /* skip malformed SSE line */ }
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
        setOutput(
          data.stdout + (data.stderr ? '\n\n[stderr]\n' + data.stderr : '')
        );
        setExitCode(data.exitCode);
      } catch (err: any) {
        if (err.name !== 'AbortError') setOutput('[Error] ' + err.message);
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Header title="Invoke Agent" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* <form onSubmit={handleSubmit(execute)} className="space-y-5"></form> */}
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
          <Field label="Prompt *">
            <textarea
              {...register('prompt')}
              rows={5}
              placeholder="What can you do?"
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-[#FF9900] placeholder-slate-400 dark:placeholder-slate-500 resize-y"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Runtime"><Input {...register('runtime')} placeholder="MyAgent" /></Field>
            <Field label="Target"><Input {...register('target')} placeholder="default" /></Field>
            <Field label="Session ID" hint="Continue an existing session">
              <Input {...register('sessionId')} placeholder="(new session)" />
            </Field>
            <Field label="User ID"><Input {...register('userId')} placeholder="default-user" /></Field>
          </div>

          <Field label="Bearer Token" hint="Required for CUSTOM_JWT gateways">
            <Input type="password" {...register('bearerToken')} />
          </Field>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('stream')} className="accent-[#FF9900]" />
            <span className="text-sm text-slate-700 dark:text-slate-300">Stream response in real-time</span>
          </label>

          <CommandPreview command={argsToCommand(args)} />

          <div className="flex gap-3">
            <RunButton
              loading={loading}
              label="Invoke"
              loadingLabel="Invoking…"
              onClick={run}
              disabled={!values.prompt.trim()}
            />
            {loading && (
              <button
                onClick={stop}
                className="bg-red-900 hover:bg-red-800 text-red-300 text-sm font-medium px-4 py-2 rounded-md transition-colors"
              >
                Stop
              </button>
            )}
          </div>

          {/* Response Panel */}
          {(output || loading) && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Response
                </span>
                {exitCode !== null && (
                  <span
                    className={`text-xs font-mono px-2 py-0.5 rounded ${
                      exitCode === 0 ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400'
                    }`}
                  >
                    exit {exitCode}
                  </span>
                )}
              </div>
              <div className="p-4">
                {loading && !output && (
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                    <span className="animate-pulse text-[#FF9900]">●</span> Waiting…
                  </div>
                )}
                <pre className="text-sm text-slate-800 dark:text-slate-200 font-mono whitespace-pre-wrap break-words leading-relaxed">
                  {output}
                  {loading && <span className="animate-pulse">▌</span>}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
