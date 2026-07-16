import { spawn } from 'child_process';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

function isValidArgs(args: unknown): args is string[] {
  return (
    Array.isArray(args) &&
    args.every((a) => typeof a === 'string' && !a.includes('\x00'))
  );
}

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
    return new Response('Invalid args', { status: 400 });
  }
  if (cwd !== undefined && !isValidPath(cwd)) {
    return new Response('Invalid cwd', { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let proc;
      if (process.platform === 'win32') {
        const cmdArgs = ["agentcore", ...args].map((arg) => {
          if (arg.length === 0) return "''";
          if (/^[A-Za-z0-9_\/\.-]+$/.test(arg)) return arg;
          return `'${arg.replace(/'/g, "''")}'`;
        }).join(' ');
        proc = spawn('powershell.exe', [
          '-NoProfile',
          '-Command',
          `npx ${cmdArgs}`,
        ], {
          cwd: cwd || process.cwd(),
          env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', TERM: 'dumb' },
          shell: false,
        });
      } else {
        proc = spawn('npx', ['agentcore', ...args], {
          cwd: cwd || process.cwd(),
          env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', TERM: 'dumb' },
          shell: false,
        });
      }

      const send = (type: string, text: string) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, text })}\n\n`)
          );
        } catch {
          // Controller may already be closed
        }
      };

      proc.stdout.on('data', (d: Buffer) => send('stdout', stripAnsi(d.toString())));
      proc.stderr.on('data', (d: Buffer) => send('stderr', stripAnsi(d.toString())));

      proc.on('error', (err) => {
        send('error', err.message);
        controller.close();
      });

      proc.on('close', (code) => {
        send('exit', String(code ?? -1));
        controller.close();
      });

      // Kill process when client disconnects
      req.signal.addEventListener('abort', () => {
        proc.kill();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
