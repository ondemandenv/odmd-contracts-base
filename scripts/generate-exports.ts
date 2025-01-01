import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

const libPath = path.join(__dirname, '../lib');
const indexPath = path.join(__dirname, '../index.ts');

// Get all TypeScript files in lib directory
const files = glob.sync('**/*.ts', {
  cwd: libPath,
  ignore: ['**/*.d.ts', '**/*.test.ts', '**/__tests__/**']
});

// Generate export statements
const exportingss = files
  .map(file => file.replace(/\.ts$/, ''))
  .map(file => file.replace(/\\/g, '/'))
  .map(file => `export * from './lib/${file}';`)
  .join('\n');

// Write to index.ts
fs.writeFileSync(indexPath, exportingss + '\n');