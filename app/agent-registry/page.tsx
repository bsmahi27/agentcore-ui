"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import Header from "@/components/Header";
import CommandPreview from "@/components/CommandPreview";
import OutputPanel from "@/components/OutputPanel";
import {
  Field,
  Input,
  Select,
  RunButton,
  SecondaryButton,
  Textarea,
} from "@/components/FormParts";
import { useWorkingDir } from "@/components/WorkingDirProvider";
import { buildRegistryArgs, argsToCommand } from "@/lib/cli";

export default function AgentRegistryPage() {
  const { cwd, setCwd } = useWorkingDir();
  const { register, watch, handleSubmit, setValue } = useForm({
    defaultValues: {
      agentdirectory: "",
      registryId: "",
      name: "",
      description: "",
      recordVersion: "1.0.0",
      descriptorType: "Agent",
      sourceType: "manual",
      endpointUrl: "",
      credentialType: "None",
      roleArn: "",
      serviceName: "bedrock-agentcore",
      region: "us-east-1",
      credentialProviderArn: "",
      scopes: "",
      customParameters: "",
      descriptors: '{"name":"my-agent","description":"Sample agent registration","version":"1.0.0"}',
      createAsDraft: true,
      submitForApproval: false,
    },
  });

  const [values, setValues] = useState(() => watch());
  const [agentOptions, setAgentOptions] = useState<Array<{ name: string; path: string }>>([]);
  const [selectedAgentPath, setSelectedAgentPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [stdout, setStdout] = useState("");
  const [stderr, setStderr] = useState("");
  const [exitCode, setExitCode] = useState<number | null>(null);

  useEffect(() => {
    const { unsubscribe } = watch((data) => setValues({ ...data } as any));
    return unsubscribe;
  }, [watch]);

  useEffect(() => {
    let ignore = false;

    const loadAgents = async () => {
      try {
        const res = await fetch("/api/agents");
        const data = await res.json();
        if (!ignore) {
          const options = Array.isArray(data.agents)
            ? data.agents
            : [];
          setAgentOptions(options);
          if (options.length && !selectedAgentPath) {
            const matched = options.find((agent: { name: string; path: string }) => agent.path === cwd);
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
    return () => {
      ignore = true;
    };
  }, [cwd, selectedAgentPath]);

  const handleAgentChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextPath = event.target.value;
    setSelectedAgentPath(nextPath);
    setValue("agentdirectory", nextPath);
    if (nextPath) setCwd(nextPath);
  };

  const execute = async () => {
    setLoading(true);
    setStdout("");
    setStderr("");

    try {
      const targetCwd = selectedAgentPath || cwd;
      const targetAgentDirectory = selectedAgentPath || values.agentdirectory || cwd;
      const args = buildRegistryArgs(values);

      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          args,
          cwd: targetCwd,
          agentdirectory: targetAgentDirectory,
          executable: "aws",
        }),
      });

      const data = await res.json();
      setStdout(data.stdout);
      setStderr(data.stderr);
      setExitCode(data.exitCode);
    } finally {
      setLoading(false);
    }
  };

  const resolvedPath =
    selectedAgentPath || values.agentdirectory || cwd
      ? `${selectedAgentPath || values.agentdirectory || cwd}`
      : cwd;

  const previewCommand = `cd ${resolvedPath} && ${argsToCommand(buildRegistryArgs(values), "aws")}`;

  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [stdout]);

  return (
    <div className="flex flex-col h-screen">
      <Header title="Agent Registry" />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <form onSubmit={handleSubmit(execute)} className="space-y-5">
            <Field label="Applications *" hint="Choose the application to register">
              <Select value={selectedAgentPath} onChange={handleAgentChange}>
                <option value="">Select an agent</option>
                {agentOptions.map((agent) => (
                  <option key={agent.path} value={agent.path}>
                    {agent.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Registry ID *" hint="Target registry ID to receive the record">
              <Input {...register("registryId")} placeholder="registry-123" />
            </Field>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Record Name *" hint="Registry record name">
                <Input {...register("name")} placeholder="MyAgent" />
              </Field>

              <Field label="Record Version" hint="For example 1.0.0">
                <Input {...register("recordVersion")} placeholder="1.0.0" />
              </Field>
            </div>

            <Field label="Description" hint="Short description shown in the registry">
              <Textarea {...register("description")} rows={3} placeholder="Describe the agent being registered" />
            </Field>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Record Type" hint="Choose the descriptor type">
                <Select {...register("descriptorType")}>
                  <option value="Agent">Agent</option>
                  <option value="MCP">MCP</option>
                  <option value="Agent Skills">Agent Skills</option>
                  <option value="Custom">Custom</option>
                </Select>
              </Field>

              <Field label="Source Type" hint="Manual or synchronized endpoint">
                <Select {...register("sourceType")}>
                  <option value="manual">Manual</option>
                  <option value="synchronize">Synchronize from endpoint</option>
                </Select>
              </Field>
            </div>

            {values.sourceType === "synchronize" && (
              <div className="space-y-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
                <Field label="Endpoint URL" hint="HTTPS endpoint the registry can inspect">
                  <Input {...register("endpointUrl")} placeholder="https://example.com/metadata" />
                </Field>

                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Credential Type" hint="Authorization strategy for the endpoint">
                    <Select {...register("credentialType")}>
                      <option value="None">None</option>
                      <option value="IAM">IAM</option>
                      <option value="OAuth">OAuth</option>
                    </Select>
                  </Field>

                  <Field label="Region" hint="Signing region for the request">
                    <Input {...register("region")} placeholder="us-east-1" />
                  </Field>
                </div>

                {values.credentialType === "IAM" && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Role ARN">
                      <Input {...register("roleArn")} placeholder="arn:aws:iam::123456789012:role/registry-role" />
                    </Field>
                    <Field label="Service Name">
                      <Input {...register("serviceName")} placeholder="bedrock-agentcore" />
                    </Field>
                  </div>
                )}

                {values.credentialType === "OAuth" && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Credential Provider ARN">
                      <Input {...register("credentialProviderArn")} placeholder="arn:aws:bedrock:us-east-1:123456789012:credential-provider/..." />
                    </Field>
                    <Field label="Scopes">
                      <Input {...register("scopes")} placeholder="openid profile" />
                    </Field>
                  </div>
                )}
              </div>
            )}

            <Field label="Descriptor JSON" hint="Protocol configuration in JSON format">
              <Textarea {...register("descriptors")} rows={6} placeholder='{"name":"my-agent"}' />
            </Field>

            <Field label="Additional Options" hint="Choose how the registry record should be created">
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...register("createAsDraft")} className="accent-[#FF9900]" />
                  Create as draft
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...register("submitForApproval")} className="accent-[#FF9900]" />
                  Submit for approval
                </label>
              </div>
            </Field>

            <CommandPreview command={previewCommand} />

            <div className="flex gap-3 flex-wrap">
              <RunButton loading={loading} label="Register Agent" loadingLabel="Registering..." />
              <SecondaryButton onClick={() => execute()} disabled={loading}>
                Run Preview Command
              </SecondaryButton>
            </div>
          </form>

          {loading && <div className="text-blue-600 font-medium">⏳ Registering agent record...</div>}

          {stdout.includes("complete") && (
            <div className="bg-green-100 text-green-700 p-3 rounded-lg">✅ Registry registration completed</div>
          )}

          {stderr && <div className="bg-red-100 text-red-700 p-3 rounded-lg">❌ Registration failed</div>}

          <div ref={logRef} className="max-h-80 overflow-auto border rounded-lg p-3 bg-slate-50 dark:bg-slate-900">
            <details>
              <summary className="cursor-pointer text-sm text-gray-500">View Raw Logs</summary>
              <OutputPanel output={stdout} error={stderr} exitCode={exitCode} loading={loading} />
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
