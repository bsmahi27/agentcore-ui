import path from "path";
import { spawn } from "child_process";
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";

export const runtime = "nodejs";

/** Validate args: must be a flat string array with no null bytes */
function isValidArgs(args: unknown): args is string[] {
  return (
    Array.isArray(args) &&
    args.every((a) => typeof a === "string" && !a.includes("\x00"))
  );
}

function quotePowerShellArg(arg: string): string {
  if (arg.length === 0) return "''";
  if (/^[A-Za-z0-9_\/\.-]+$/.test(arg)) return arg;
  return `'${arg.replace(/'/g, "''")}'`;
}

/** Validate cwd: no shell metacharacters or null bytes */
function isValidPath(p: unknown): p is string {
  if (typeof p !== "string") return false;
  return !/[;&|`$<>]/.test(p) && !p.includes("\x00");
}

/**** Strip ANSI escape sequences and clean up CLI output ****/
function stripAnsi(str: string): string {
  return str
    .replace(
      /\x1B\[[\d;?]*[A-Za-z]|\x1B\][^\x07]*\x07|\x1B[PX^_][^\x1B]*\x1B\\|[\x1B\x9B][\x40-\x5F]/g,
      ""
    )
    .replace(/[\u2800-\u28FF]/g, "") // braille spinner chars like ⠋ ⠙ ⠹
    .split("\r")
    .map(line => line.trim())
    .filter(Boolean)
    .filter((line, i, arr) => line !== arr[i - 1])
    .filter(line => !/^\.+$/.test(line))
    .join("\n");
}

/** Check if deployment was successful and run post-deployment registration */
async function runPostDeploymentRegistration(agentPath: string, deployExitCode: number, deployOutput: string): Promise<{ registrationOutput: string; registrationExitCode: number }> {
  // Only run registration if deploy succeeded
  if (deployExitCode !== 0) {
    return {
      registrationOutput: "[Skipped: Deployment failed, registration not triggered]",
      registrationExitCode: 0,
    };
  }

  // Check if register_agent.py exists
  const registerScriptPath = path.join(agentPath, "register_agent.py");
  try {
    await fs.access(registerScriptPath);
  } catch {
    return {
      registrationOutput: "[Skipped: register_agent.py not found]",
      registrationExitCode: 0,
    };
  }

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";

    const proc = spawn("python", [registerScriptPath], {
      cwd: agentPath,
      shell: false,
    });

    proc.stdout.on("data", (d: Buffer) => {
      stdout += d.toString();
    });

    proc.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });

    proc.on("error", (err) => {
      resolve({
        registrationOutput: `[Registration Error] ${err.message}`,
        registrationExitCode: -1,
      });
    });

    proc.on("close", (code) => {
      const output = stdout + (stderr ? `\n[stderr]\n${stderr}` : "");
      resolve({
        registrationOutput: stripAnsi(output),
        registrationExitCode: code || 0,
      });
    });

    // Kill after 2 minutes
    const timer = setTimeout(() => {
      proc.kill();
      resolve({
        registrationOutput: stdout + "\n[Registration process timed out]",
        registrationExitCode: -1,
      });
    }, 120_000);

    proc.on("close", () => clearTimeout(timer));
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { args, cwd, agentdirectory, executable } = body;
  // const { args, cwd } = body;

  if (!isValidArgs(args)) {
    return NextResponse.json({ error: "Invalid args" }, { status: 400 });
  }
  if (cwd !== undefined && !isValidPath(cwd)) {
    return NextResponse.json({ error: "Invalid cwd" }, { status: 400 });
  }

  return new Promise<NextResponse>((resolve) => {

    const finalCwd = path.normalize(
      agentdirectory
        ? path.isAbsolute(agentdirectory)
          ? agentdirectory
          : path.join(cwd || process.cwd(), agentdirectory)
        : cwd || process.cwd(),
    );

    const runCommand = typeof executable === 'string' && executable.trim() ? executable : 'npx';
    const runArgs = runCommand === 'npx' ? ['agentcore', ...args] : args;

    let proc;
    if (process.platform === 'win32') {
      const shellCommand = runCommand === 'npx'
        ? `npx ${['agentcore', ...args].map(quotePowerShellArg).join(' ')}`
        : [runCommand, ...runArgs].map(quotePowerShellArg).join(' ');
      proc = spawn('powershell.exe', [
        '-NoProfile',
        '-Command',
        shellCommand,
      ], {
        cwd: finalCwd,
        shell: false,
      });
    } else {
      proc = spawn(runCommand, runArgs, {
        cwd: finalCwd,
        shell: false,
      });
    }

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    proc.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });

    proc.on("error", (err) => {
      resolve(
        NextResponse.json({ stdout: "", stderr: err.message, exitCode: -1 }),
      );
    });

    proc.on("close", async (code) => {
      const deployOutput = stripAnsi(stdout);
      const deployStderr = stripAnsi(stderr);
      
      // Check if this was a deploy command and if it succeeded
      const isDeploy = args.includes("deploy");
      
      if (isDeploy && code === 0) {
        // Run post-deployment registration
        const { registrationOutput, registrationExitCode } = await runPostDeploymentRegistration(
          finalCwd,
          code,
          deployOutput
        );
        
        resolve(
          NextResponse.json({
            stdout: deployOutput + "\n\n" + "=".repeat(60) + "\n[REGISTRATION]\n" + "=".repeat(60) + "\n" + registrationOutput,
            stderr: deployStderr + (registrationExitCode !== 0 ? `\n[Registration exit code: ${registrationExitCode}]` : ""),
            exitCode: code,
            registrationExitCode,
          }),
        );
      } else {
        resolve(
          NextResponse.json({
            stdout: deployOutput,
            stderr: deployStderr,
            exitCode: code,
          }),
        );
      }
    });

    // Kill after 5 minutes to avoid hanging
    const timer = setTimeout(() => {
      proc.kill();
      resolve(
        NextResponse.json({
          stdout,
          stderr: stderr + "\n[Process timed out]",
          exitCode: -1,
        }),
      );
    }, 300_000);

    proc.on("close", () => clearTimeout(timer));
  });
}
