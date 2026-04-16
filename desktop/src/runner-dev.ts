import { spawn } from 'node:child_process'
import path from 'node:path'

const repoRoot = path.resolve(__dirname, '..', '..')
const uiDir = path.join(repoRoot, 'ui')

const ui = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '7710'], {
  cwd: uiDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

ui.on('exit', (code) => {
  process.exit(code ?? 0)
})

