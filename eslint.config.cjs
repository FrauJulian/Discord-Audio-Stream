/** @type {import('eslint').Linter.FlatConfig[]} */
const config = [
  // Globale Ignores (ersetzt .eslintignore)
  {
    ignores: ['dist/', 'node_modules/'],
  },

  // Haupt-Setup für TS/JS-Dateien
  {
    files: ['**/*.{ts,tsx,js,cjs,mjs}'],

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module', // du schreibst TS mit ES-Imports; Laufzeit ist CJS nach Transpile
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        // schnelles Profil: kein Type-Checker, nur Syntax-Linting
        ecmaFeatures: {},
      },
    },

    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      import: require('eslint-plugin-import'),
      promise: require('eslint-plugin-promise'),
      'unused-imports': require('eslint-plugin-unused-imports'),
      n: require('eslint-plugin-n'),
    },

    rules: {
      /* Basis */
      'no-debugger': 'warn',

      /* TypeScript */
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': 'off', // schneller über unused-imports
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off', // pragmatisch für großen Bot

      /* Imports */
      'import/first': 'error',
      'import/no-duplicates': 'error',
      'import/newline-after-import': 'warn',
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            '**/*.config.{js,cjs,mjs,ts}',
            '**/scripts/**',
            '**/*.test.{ts,js}',
            '**/Testing.{ts,js}',
            '**/.eslintrc.{js,cjs}',
          ],
        },
      ],

      /* Node (wir kompilieren TS → CJS; ES-Syntax erlauben) */
      'n/no-missing-import': 'off', // TypeScript-Resolver übernimmt
      'n/no-unsupported-features/es-syntax': 'off',

      /* Promises (Discord-/DB-/HTTP-Logik) */
      'promise/catch-or-return': 'warn',
      'promise/always-return': 'off',

      /* bewusste „Fire-and-forget“-Promises mit `void` */
      'no-void': ['warn', { allowAsStatement: true }],
    },

    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          // nutzt automatisch deine tsconfig-Pfade
        },
        node: true,
      },
    },
  },

  // Reine JS/CJS-Skripte (Build/Hooks) dürfen require/exporte nutzen
  {
    files: ['**/*.{js,cjs}'],
    languageOptions: {
      sourceType: 'script',
    },
    rules: {
      'n/global-require': 'off',
    },
  },
];

module.exports = config;
