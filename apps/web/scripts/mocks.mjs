// cross-platform stand-in for NEXT_PUBLIC_API_MOCKS=1 next <command>, without adding cross-env
process.env.NEXT_PUBLIC_API_MOCKS = '1';
const command = process.argv[2] ?? 'dev';

process.argv.splice(
  2,
  Infinity,
  command,
  ...(command === 'build' ? [] : ['--hostname', '127.0.0.1', '--port', '3102']),
);
await import('next/dist/bin/next');
