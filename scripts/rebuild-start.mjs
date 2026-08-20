import { execSync, spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = process.env.PORT ?? '5173';
const isWin = process.platform === 'win32';

function killPort(targetPort) {
  try {
    if (isWin) {
      const result = execSync(`netstat -ano | findstr :${targetPort} | findstr LISTENING`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      const pids = new Set(
        result
          .split('\n')
          .map((line) => line.trim().split(/\s+/).pop())
          .filter((pid) => pid && pid !== '0'),
      );
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
        } catch {
          // already stopped
        }
      }
      return;
    }

    execSync(`lsof -ti:${targetPort} | xargs kill -9`, { stdio: 'ignore' });
  } catch {
    // nothing listening
  }
}

console.log(`Stopping anything on port ${port}...`);
killPort(port);

console.log('Building production bundle...');
execSync('npm run build', { stdio: 'inherit', cwd: root });

console.log(`Starting server on http://localhost:${port}`);
console.log('After it opens, hard refresh the browser with Ctrl+F5.');

const child = spawn(isWin ? 'npm run start' : 'npm', isWin ? [] : ['run', 'start'], {
  cwd: root,
  stdio: 'inherit',
  shell: isWin,
  env: { ...process.env, PORT: port },
});

child.on('exit', (code) => process.exit(code ?? 0));
