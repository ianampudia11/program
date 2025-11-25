#!/usr/bin/env node


import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.NODE_ENV = 'production';





const serverFile = path.join(__dirname, 'dist', 'index.js');
try {
  const fs = await import('fs');
  if (!fs.existsSync(serverFile)) {
    console.error('❌ Server file not found:', serverFile);
    console.error('💡 Make sure you have extracted all files properly');
    process.exit(1);
  }
  
  const stats = fs.statSync(serverFile);

} catch (error) {
  console.error('❌ Error checking server file:', error.message);
  process.exit(1);
}

const args = ['--require', 'dotenv/config', 'dist/index.js'];


const child = spawn('node', args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

child.on('error', (error) => {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
});

child.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Server exited with code ${code}`);
    process.exit(code);
  }
});

process.on('SIGINT', () => {

  child.kill('SIGINT');
});

process.on('SIGTERM', () => {

  child.kill('SIGTERM');
});
