const { spawn } = require('child_process');
const path = require('path');

const electron = require('electron');
const appPath = path.join(__dirname, 'smoke-app');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electron, [appPath], {
  cwd: path.join(__dirname, '..'),
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
