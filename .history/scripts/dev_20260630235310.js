import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWin = process.platform === 'win32';

const backendDir = path.resolve(__dirname, '..', 'backend');

const pythonPath = isWin
  ? path.resolve(backendDir, '.venv', 'Scripts', 'python.exe')
  : path.resolve(backendDir, '.venv', 'bin', 'python');

console.log(`[Dev Runner] Python path: ${pythonPath}`);

// Start Django server
const djangoProcess = spawn(
  pythonPath,
  ['manage.py', 'runserver', '127.0.0.1:8000'],
  {
    cwd: backendDir,
    stdio: 'inherit',
    shell: true,
  }
);

// Start Vite server
const viteCommand = isWin ? 'npx.cmd' : 'npx';

const viteProcess = spawn(viteCommand, ['vite', 'dev'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  shell: true,
});

process.on('SIGINT', () => {
  djangoProcess.kill();
  viteProcess.kill();
});