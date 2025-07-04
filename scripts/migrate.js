// scripts/migrate.js
const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Running TypeScript migration...');

try {
  // Run the TypeScript migration using ts-node
  execSync('npx tsx scripts/migrate.ts', {
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}