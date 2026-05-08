import { spawn } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/** Validate args: must be a flat string array with no null bytes */
function isValidArgs(args: unknown): args is string[] {
  return (
    Array.isArray(args) &&
    args.every((a) => typeof a === 'string' && !a.includes('\x00'))
  );
}

/** Validate cwd: no shell metacharacters or null bytes */
function isValidPath(p: unknown): p is string {
  if (typeof p !== 'string') return false;
  return !/[;&|`$<>]/.test(p) && !p.includes('\x00');
}

/** Strip ANSI escape sequences from CLI output */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[\d;?]*[A-Za-z]|\x1B\][^\x07]*\x07|\x1B[PX^_][^\x1B]*\x1B\\|[\x1B\x9B][\x40-\x5F]|\x1B[()][AB012]/g, '').replace(/[\x00-\x08\x0E-\x1F]/g, '');
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { args, cwd } = body;

  if (!isValidArgs(args)) {
    return NextResponse.json({ error: 'Invalid args' }, { status: 400 });
  }
  if (cwd !== undefined && !isValidPath(cwd)) {
    return NextResponse.json({ error: 'Invalid cwd' }, { status: 400 });
  }

  return new Promise<NextResponse>((resolve) => {
    const bin = process.platform === 'win32' ? 'agentcore.cmd' : 'agentcore';
    const proc = spawn(bin, args, {
      cwd: cwd || process.cwd(),
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', TERM: 'dumb' },
      shell: false, // Never use shell – prevents injection
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    proc.on('error', (err) => {
      resolve(NextResponse.json({ stdout: '', stderr: err.message, exitCode: -1 }));
    });

    proc.on('close', (code) => {
      resolve(NextResponse.json({ stdout: stripAnsi(stdout), stderr: stripAnsi(stderr), exitCode: code }));
    });

    // Kill after 5 minutes to avoid hanging
    const timer = setTimeout(() => {
      proc.kill();
      resolve(
        NextResponse.json({ stdout, stderr: stderr + '\n[Process timed out]', exitCode: -1 })
      );
    }, 300_000);

    proc.on('close', () => clearTimeout(timer));
  });
}
