

const isWin = process.platform === 'win32';
const backendDir = path.resolve(__dirname, '..', 'backend');
const pythonPath = isWin
  ? path.resolve(backendDir, '.venv', 'Scripts', 'python.exe')
  : path.resolve(backendDir, '.venv', 'bin', 'python');

console.log(`[Dev Runner] Python path: ${pythonPath}`);

// Start Django server
const djangoProcess = spawn(pythonPath, ['manage.py', 'runserver', '127.0.0.1:8000'], {
  cwd: backendDir,
  stdio: 'inherit',
  shell: true,
});

djangoProcess.on('error', (err) => {
  console.error('[Dev Runner] Failed to start Django server:', err);
});

// Start Vite server
const viteCommand = isWin ? 'npx.cmd' : 'npx';
const viteProcess = spawn(viteCommand, ['vite', 'dev'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  shell: true,
});

viteProcess.on('error', (err) => {
  console.error('[Dev Runner] Failed to start Vite dev server:', err);
});

// Clean up both processes on exit
const cleanUp = () => {
  console.log('\n[Dev Runner] Terminating backend and frontend servers...');
  try {
    if (djangoProcess) djangoProcess.kill();
  } catch (e) {}
  try {
    if (viteProcess) viteProcess.kill();
  } catch (e) {}
  process.exit();
};

process.on('SIGINT', cleanUp);
process.on('SIGTERM', cleanUp);
process.on('exit', cleanUp);
