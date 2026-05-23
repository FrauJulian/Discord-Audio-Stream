const { copyFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

const declarationFile = join(__dirname, '..', 'dist', 'index.d.ts');
const esmDeclarationFile = join(__dirname, '..', 'dist', 'index.d.mts');

if (!existsSync(declarationFile)) {
    throw new Error(`Missing declaration file: ${declarationFile}`);
}

copyFileSync(declarationFile, esmDeclarationFile);
