import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assets, VERSION } from './obscura-release.mts';

// import.meta is unavailable once Playwright transpiles this file to CommonJS, so paths are relative to the repo root (npm scripts and Playwright both run there)
export const obscuraDir = path.resolve('e2e', '.obscura', VERSION);
const binaryName = process.platform === 'win32' ? 'obscura.exe' : 'obscura';
const stampFile = path.join(obscuraDir, 'files.sha256');

const sha256 = (data: Buffer) => createHash('sha256').update(data).digest('hex');

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(obscuraDir, path.join(entry.parentPath, entry.name)));
}

// hashes taken right after a verified extraction: a swapped exe or dll is caught on every later run
async function verifiedBinary(): Promise<string | undefined> {
  if (!existsSync(stampFile)) return undefined;
  const lines = (await readFile(stampFile, 'utf8')).trim().split('\n');

  for (const line of lines) {
    const [hash, rel] = line.split('  ');
    const full = path.join(obscuraDir, rel);

    if (!existsSync(full) || sha256(await readFile(full)) !== hash) return undefined;
  }

  const binary = path.join(obscuraDir, binaryName);

  return lines.some((line) => line.endsWith(`  ${binaryName}`)) ? binary : undefined;
}

export async function installObscura(): Promise<string> {
  const existing = await verifiedBinary();

  if (existing) return existing;

  const asset = assets[`${process.platform}-${process.arch}`];

  if (!asset) throw new Error(`Obscura ${VERSION}: нет закреплённой сборки для ${process.platform}-${process.arch}`);

  await rm(obscuraDir, { recursive: true, force: true });
  await mkdir(obscuraDir, { recursive: true });

  const url = `https://github.com/h4ckf0r0day/obscura/releases/download/${VERSION}/${asset.name}`;
  const res = await fetch(url);

  if (!res.ok) throw new Error(`Obscura: ${url} ответил ${res.status}`);
  const archive = Buffer.from(await res.arrayBuffer());
  const actual = sha256(archive);

  if (actual !== asset.sha256) {
    await rm(obscuraDir, { recursive: true, force: true });
    throw new Error(
      `Obscura: sha256 ${asset.name} не совпал: ожидали ${asset.sha256}, получили ${actual}. Ничего не распаковано.`,
    );
  }

  const archivePath = path.join(obscuraDir, asset.name);

  await writeFile(archivePath, archive);

  // Git Bash puts GNU tar first in PATH, and it can't read zip; System32 bsdtar can
  const tar =
    process.platform === 'win32' ? path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
  const extracted = spawnSync(tar, ['-xf', archivePath, '-C', obscuraDir], { stdio: 'inherit' });

  if (extracted.status !== 0)
    throw new Error(`Obscura: распаковка ${asset.name} завершилась с кодом ${extracted.status}`);
  await rm(archivePath);

  const files = await listFiles(obscuraDir);

  if (!files.includes(binaryName)) throw new Error(`Obscura: в корне ${asset.name} нет ${binaryName}`);
  const stamp = await Promise.all(
    files.map(async (rel) => `${sha256(await readFile(path.join(obscuraDir, rel)))}  ${rel}`),
  );

  await writeFile(stampFile, stamp.join('\n') + '\n');

  return path.join(obscuraDir, binaryName);
}

if (process.argv[1]?.endsWith('obscura-install.mts')) {
  installObscura().then(console.log, (error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
