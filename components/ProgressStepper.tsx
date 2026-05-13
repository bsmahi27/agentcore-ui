"use client";

type StepStatus = "pending" | "running" | "done" | "error";

interface Step {
  label: string;
  status: StepStatus;
}

export default function ProgressStepper({ steps }: { steps: Step[] }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow p-4 space-y-3">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-3">
          <StatusIcon status={step.status} />
          <span
            className={`text-sm ${
              step.status === "done"
                ? "text-green-600"
                : step.status === "running"
                  ? "text-blue-600"
                  : step.status === "error"
                    ? "text-red-600"
                    : "text-gray-400"
            }`}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatusIcon({ status }: { status: StepStatus }) {
  if (status === "done") {
    return <span className="text-green-600">✔</span>;
  }
  if (status === "running") {
    return <span className="animate-spin text-blue-600">⏳</span>;
  }
  if (status === "error") {
    return <span className="text-red-600">❌</span>;
  }
  return <span className="opacity-40">⬜</span>;
}
