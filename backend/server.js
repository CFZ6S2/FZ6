const { spawn } = require('child_process');
const path = require('path');

console.log('Node.js wrapper starting...');

// Set environment variables
process.env.PYTHONUNBUFFERED = '1';

// Get port from Railway environment
const port = process.env.PORT || 8000;

// Spawn Python process
console.log('Starting Python FastAPI application...');
const pythonProcess = spawn('python', ['-m', 'uvicorn', 'main_simple:app', '--host', '0.0.0.0', '--port', port.toString(), '--workers', '1', '--log-level', 'info'], {
  stdio: 'inherit',
  shell: true
});

// Handle process events
pythonProcess.on('error', (error) => {
  console.error('Failed to start Python process:', error);
  process.exit(1);
});

pythonProcess.on('exit', (code, signal) => {
  console.log(`Python process exited with code ${code} and signal ${signal}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  pythonProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  pythonProcess.kill('SIGINT');
});

console.log(`Node.js wrapper started, Python process PID: ${pythonProcess.pid}`);