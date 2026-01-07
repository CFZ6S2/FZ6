const functions = require('./index');
console.log('Exports found:');
const keys = Object.keys(functions);
console.log(keys);

const required = ['listZombieUsers', 'cleanupZombieUsers'];
const missing = required.filter(k => !keys.includes(k));

if (missing.length === 0) {
    console.log('✅ Success: All required functions exported.');
    process.exit(0);
} else {
    console.error(`❌ Missing exports: ${missing.join(', ')}`);
    process.exit(1);
}
