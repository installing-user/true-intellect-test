import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { installObscura } from './obscura-install.mts';

export const useObscura = process.env.E2E_BROWSER !== 'chromium';

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer().once('error', reject);

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };

      server.close(() => resolve(port));
    });
  });
}

function listeners(port: number): string[] {
  const out =
    process.platform === 'win32'
      ? spawnSync('netstat', ['-ano', '-p', 'TCP'], { encoding: 'utf8' }).stdout
      : spawnSync('ss', ['-ltnH'], { encoding: 'utf8' }).stdout;

  return out
    .split('\n')
    .filter((line) => /LISTEN/i.test(line) || process.platform !== 'win32')
    .map((line) =>
      line
        .trim()
        .split(/\s+/)
        .find((col) => col.endsWith(`:${port}`)),
    )
    .filter((addr): addr is string => addr !== undefined);
}

async function waitForCdp(port: number, token: string) {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    const res = await fetch(`http://127.0.0.1:${port}/json/version`, {
      headers: { authorization: `Bearer ${token}` },
    }).catch(() => null);

    if (res?.ok) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Obscura не поднял CDP на 127.0.0.1:${port} за 15 с`);
}

export default async function globalSetup() {
  if (!useObscura) return;
  const binary = await installObscura();
  const port = await freePort();
  const token = randomBytes(32).toString('hex');

  const child = spawn(binary, ['serve', '--port', String(port), '--allow-private-network'], {
    env: { ...process.env, OBSCURA_CDP_TOKEN: token },
    stdio: ['ignore', 'inherit', 'inherit'],
  });

  const kill = () => {
    if (child.exitCode !== null) return;
    // serve spawns obscura-worker children; killing only the parent on Windows would orphan them
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F']);
    else child.kill('SIGKILL');
  };

  process.once('exit', kill);

  try {
    await waitForCdp(port, token);
    const exposed = listeners(port).filter((addr) => !addr.startsWith('127.0.0.1:') && !addr.startsWith('[::1]:'));

    if (exposed.length > 0) throw new Error(`Obscura слушает не только loopback: ${exposed.join(', ')}`);
  } catch (error) {
    kill();
    throw error;
  }

  process.env.OBSCURA_CDP_URL = `http://127.0.0.1:${port}`;
  process.env.OBSCURA_CDP_TOKEN = token;

  return kill;
}
