import path from "path";
import { spawn } from "child_process";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/** Validate args: must be a flat string array with no null bytes */
function isValidArgs(args: unknown): args is string[] {
  return (
    Array.isArray(args) &&
    args.every((a) => typeof a === "string" && !a.includes("\x00"))
  );
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

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { args, cwd, agentdirectory } = body;
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

    console.log("Running in:", finalCwd); // TODO: remove after debugging
    console.log("Args:", args);

    const proc = spawn("npx", ["agentcore", ...args], {
      cwd: finalCwd,
      shell: true, // required for npx on Windows
    });

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

    proc.on("close", (code) => {
      resolve(
        NextResponse.json({
          stdout: stripAnsi(stdout),
          stderr: stripAnsi(stderr),
          exitCode: code,
        }),
      );
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
