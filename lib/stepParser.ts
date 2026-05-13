export type StepStatus = "pending" | "running" | "done" | "error";

export interface Step {
  label: string;
  status: StepStatus;
}

const STEP_ORDER = [
  "Load deployment target",
  "Validate project",
  "Build CDK project",
  "Synthesize CloudFormation",
  "Check bootstrap status",
  "Check stack status",
];

export function parseSteps(output: string): Step[] {
  const steps: Step[] = STEP_ORDER.map((label) => ({
    label,
    status: "pending",
  }));

  STEP_ORDER.forEach((label, index) => {
    if (output.includes(`✓ ${label}`)) {
      steps[index].status = "done";
    } else if (output.includes(label)) {
      steps[index].status = "running";

      // mark previous steps as done
      for (let i = 0; i < index; i++) {
        steps[i].status = "done";
      }
    }
  });

  if (output.toLowerCase().includes("error")) {
    const runningIndex = steps.findIndex((s) => s.status === "running");
    if (runningIndex !== -1) {
      steps[runningIndex].status = "error";
    }
  }

  return steps;
}
