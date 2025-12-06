const { exec } = require('child_process');
const fs = require('fs');

const logStream = fs.createWriteStream('build-debug.log', { flags: 'a' });

console.log('Starting build...');
logStream.write('Starting build...\n');

const build = exec('npm run build', { cwd: __dirname });

build.stdout.on('data', (data) => {
    console.log(data);
    logStream.write(data);
});

build.stderr.on('data', (data) => {
    console.error(data);
    logStream.write(data);
});

build.on('close', (code) => {
    console.log(`Build exited with code ${code}`);
    logStream.write(`Build exited with code ${code}\n`);
});
