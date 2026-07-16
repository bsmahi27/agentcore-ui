// "use client";

// import { useState, useEffect } from "react";
// import { useForm } from "react-hook-form";
// import Header from "@/components/Header";
// import CommandPreview from "@/components/CommandPreview";
// import OutputPanel from "@/components/OutputPanel";
// import {
//   Field,
//   Input,
//   RunButton,
//   SecondaryButton,
// } from "@/components/FormParts";
// import { useWorkingDir } from "@/components/WorkingDirProvider";
// import { buildDeployArgs, argsToCommand } from "@/lib/cli";

// import ProgressStepper from "@/components/ProgressStepper";
// import { parseSteps } from "@/lib/stepParser";

// export default function DeployPage() {
//   const { cwd } = useWorkingDir();

//   const { register, watch, handleSubmit } = useForm({
//     defaultValues: {
//       agentdirectory: "",
//       target: "",
//       autoConfirm: true,
//       verbose: false,
//       dryRun: false,
//       diff: false,
//     },
//   });

//   // ✅ Track form values
//   const [values, setValues] = useState(() => watch());

//   useEffect(() => {
//     const { unsubscribe } = watch((data) => setValues({ ...data } as any));
//     return unsubscribe;
//   }, [watch]);

//   // ✅ Mode tracking (KEY FIX)
//   const [mode, setMode] = useState<"deploy" | "dryRun" | "diff">("deploy");

//   // ✅ Build effective args for preview
//   const effectiveValues = {
//     ...values,
//     dryRun: mode === "dryRun",
//     diff: mode === "diff",
//   };

//   const args = buildDeployArgs(effectiveValues);

//   const [stdout, setStdout] = useState("");
//   const [stderr, setStderr] = useState("");
//   const [exitCode, setExitCode] = useState<number | null>(null);
//   const [loading, setLoading] = useState(false);
//   const steps = parseSteps(stdout);

//   // ✅ Execute command
//   const execute = async (overrideArgs?: string[]) => {
//     setLoading(true);
//     setStdout("");
//     setStderr("");

//     try {
//       const res = await fetch("/api/run", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           args: overrideArgs ?? args,
//           cwd,
//           agentdirectory: values.agentdirectory, // ✅ important
//         }),
//       });

//       const data = await res.json();
//       setStdout(data.stdout);
//       setStderr(data.stderr);
//       setExitCode(data.exitCode);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ✅ Actions
//   const onDeploy = () => {
//     setMode("deploy");
//     execute();
//   };

//   const dryRun = () => {
//     setMode("dryRun"); // ✅ updates preview
//     execute(buildDeployArgs({ ...values, dryRun: true, diff: false }));
//   };

//   const diff = () => {
//     setMode("diff"); // ✅ updates preview
//     execute(buildDeployArgs({ ...values, dryRun: false, diff: true }));
//   };

//   // ✅ Show full command with directory context
//   const resolvedPath =
//     values.agentdirectory || cwd ? `${values.agentdirectory || cwd}` : cwd;

//   const previewCommand = `cd ${resolvedPath} && ${argsToCommand(args)}`;

//   return (
//     <div className="flex flex-col h-screen">
//       <Header title="Deploy" />

//       <div className="flex-1 overflow-auto p-6">
//         <div className="max-w-2xl mx-auto space-y-6">
//           <form onSubmit={handleSubmit(onDeploy)} className="space-y-5">
//             <Field
//               label="Project Folder"
//               hint="Generated Agents Folder (default: current working directory)"
//             >
//               <Input
//                 {...register("agentdirectory")}
//                 placeholder="sampleagent"
//               />
//             </Field>

//             <Field
//               label="Target"
//               hint="Deployment target name (default: 'default')"
//             >
//               <Input {...register("target")} placeholder="default" />
//             </Field>

//             <div className="grid grid-cols-2 gap-3">
//               {[
//                 { name: "autoConfirm", label: "Auto-confirm prompts (-y)" },
//                 { name: "verbose", label: "Verbose output (-v)" },
//               ].map(({ name, label }) => (
//                 <label
//                   key={name}
//                   className="flex items-center gap-2 cursor-pointer"
//                 >
//                   <input
//                     type="checkbox"
//                     {...register(name as never)}
//                     className="accent-[#FF9900]"
//                   />
//                   <span className="text-sm text-slate-700 dark:text-slate-300">
//                     {label}
//                   </span>
//                 </label>
//               ))}
//             </div>

//             {/* ✅ Command Preview */}
//             <CommandPreview command={previewCommand} />

//             <div className="flex gap-3 flex-wrap">
//               <RunButton
//                 loading={loading}
//                 label="Deploy"
//                 loadingLabel="Deploying…"
//               />

//               <SecondaryButton onClick={dryRun} disabled={loading}>
//                 Dry Run
//               </SecondaryButton>

//               <SecondaryButton onClick={diff} disabled={loading}>
//                 Show CDK Diff
//               </SecondaryButton>
//             </div>
//           </form>

//           {/* <OutputPanel
//             output={stdout}
//             error={stderr}
//             exitCode={exitCode}
//             loading={loading}
//           /> */}
//           <ProgressStepper steps={steps} />
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
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
} from "@/components/FormParts";
import { useWorkingDir } from "@/components/WorkingDirProvider";
import { buildDeployArgs, argsToCommand } from "@/lib/cli";

import ProgressStepper from "@/components/ProgressStepper";
import { parseSteps } from "@/lib/stepParser";

export default function DeployPage() {
  const { cwd, setCwd } = useWorkingDir();

  const { register, watch, handleSubmit, setValue } = useForm({
    defaultValues: {
      agentdirectory: "",
      target: "",
      autoConfirm: true,
      verbose: false,
      dryRun: false,
      diff: false,
    },
  });

  const [values, setValues] = useState(() => watch());
  const [agentOptions, setAgentOptions] = useState<Array<{ name: string; path: string }>>([]);
  const [selectedAgentPath, setSelectedAgentPath] = useState('');
  const [hasUserSelectedAgent, setHasUserSelectedAgent] = useState(false);

  useEffect(() => {
    const { unsubscribe } = watch((data) =>
      setValues({ ...data } as any)
    );
    return unsubscribe;
  }, [watch]);

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

  // ✅ Mode tracking
  const [mode, setMode] = useState<"deploy" | "dryRun" | "diff">("deploy");

  const effectiveValues = {
    ...values,
    dryRun: mode === "dryRun",
    diff: mode === "diff",
  };

  const args = buildDeployArgs(effectiveValues);

  const [stdout, setStdout] = useState("");
  const [stderr, setStderr] = useState("");
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const steps = parseSteps(stdout);

  const handleAgentChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextPath = event.target.value;
    setSelectedAgentPath(nextPath);
    setValue('agentdirectory', nextPath);
    if (nextPath) setCwd(nextPath);
  };

  // ✅ Auto scroll logs
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [stdout]);

  // ✅ Execute command
  const execute = async (overrideArgs?: string[]) => {
    setLoading(true);
    setStdout("");
    setStderr("");

    try {
      const targetCwd = selectedAgentPath || cwd;
      const targetAgentDirectory = selectedAgentPath || values.agentdirectory || cwd;
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          args: overrideArgs ?? args,
          cwd: targetCwd,
          agentdirectory: targetAgentDirectory,
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

  const onDeploy = () => {
    setMode("deploy");
    execute();
  };

  const dryRun = () => {
    setMode("dryRun");
    execute(buildDeployArgs({ ...values, dryRun: true, diff: false }));
  };

  const diff = () => {
    setMode("diff");
    execute(buildDeployArgs({ ...values, dryRun: false, diff: true }));
  };

  const resolvedPath =
    selectedAgentPath || values.agentdirectory || cwd
      ? `${selectedAgentPath || values.agentdirectory || cwd}`
      : cwd;

  const previewCommand = `cd ${resolvedPath} && ${argsToCommand(args)}`;

  return (
    <div className="flex flex-col h-screen">
      <Header title="Deploy" />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* ✅ FORM */}
          <form onSubmit={handleSubmit(onDeploy)} className="space-y-5">
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

            <Field
              label="Project Folder"
              hint="Generated Agents Folder (default: current working directory)"
            >
              <Input
                {...register("agentdirectory")}
                placeholder="sampleagent"
              />
            </Field>

            <Field
              label="Target"
              hint="Deployment target name (default: 'default')"
            >
              <Input {...register("target")} placeholder="default" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              {[
                { name: "autoConfirm", label: "Auto-confirm (-y)" },
                { name: "verbose", label: "Verbose (-v)" },
              ].map(({ name, label }) => (
                <label
                  key={name}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    {...register(name as never)}
                    className="accent-[#FF9900]"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>

            {/* ✅ Command Preview */}
            <CommandPreview command={previewCommand} />

            <div className="flex gap-3 flex-wrap">
              <RunButton
                loading={loading}
                label="Deploy"
                loadingLabel="Deploying..."
              />

              <SecondaryButton onClick={dryRun} disabled={loading}>
                Dry Run
              </SecondaryButton>

              <SecondaryButton onClick={diff} disabled={loading}>
                CDK Diff
              </SecondaryButton>
            </div>
          </form>

          {/* ✅ STATUS BANNERS */}
          {loading && (
            <div className="text-blue-600 font-medium">
              ⏳ Deployment in progress...
            </div>
          )}

          {stdout.includes("complete") && (
            <div className="bg-green-100 text-green-700 p-3 rounded-lg">
              ✅ Operation completed successfully
            </div>
          )}

          {stderr && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg">
              ❌ Deployment failed
            </div>
          )}

          {/* ✅ Stepper */}
          <ProgressStepper steps={steps} />

          {/* ✅ Collapsible Logs */}
          <div
            ref={logRef}
            className="max-h-80 overflow-auto border rounded-lg p-3 bg-slate-50 dark:bg-slate-900"
          >
            <details>
              <summary className="cursor-pointer text-sm text-gray-500">
                View Raw Logs
              </summary>

              <OutputPanel
                output={stdout}
                error={stderr}
                exitCode={exitCode}
                loading={loading}
              />
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
