export const VERSION = 'v0.2.7';

export const assets: Record<string, { name: string; sha256: string }> = {
  'win32-x64': {
    name: 'obscura-x86_64-windows.zip',
    sha256: 'be983b663552e11faf8c1e07696578bad622dbeb48afb9f59036032ca8e97fb3',
  },
  'linux-x64': {
    name: 'obscura-x86_64-linux.tar.gz',
    sha256: '11b53d27cd743e00e196e216920e7f3f794cf378e3f1792b8d25d3beabaf9cad',
  },
  'darwin-arm64': {
    name: 'obscura-aarch64-macos.tar.gz',
    sha256: 'fc7e73f23058f18d6d5be983d83b24ba374d12167677657a307a9476c0f5a7c1',
  },
};
