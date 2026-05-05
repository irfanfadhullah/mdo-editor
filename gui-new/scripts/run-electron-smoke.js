const { spawn } = require('child_process');
const path = require('path');

const electron = require('electron');
const repoRoot = path.join(__dirname, '..');
const target = process.argv[2]
  ? path.resolve(repoRoot, process.argv[2])
  : path.join(__dirname, 'smoke-app');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electron, [target, ...process.argv.slice(3)], {
  cwd: repoRoot,
  env,
  stdio: 'inherit',
  windowsHide: false,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
