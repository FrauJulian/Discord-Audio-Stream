/** @type {import('eslint').Linter.FlatConfig[]} */
const config = [
    {
        ignores: ['dist/', 'node_modules/'],
    },

    {
        files: ['**/*.{ts,tsx,js,cjs,mjs}'],

        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parser: require('@typescript-eslint/parser'),
            parserOptions: {
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
            /* Base */
            'no-debugger': 'warn',

            /* TypeScript */
            '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
            '@typescript-eslint/no-unused-vars': 'off',
            'unused-imports/no-unused-imports': 'warn',
            'unused-imports/no-unused-vars': [
                'warn',
                { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/no-explicit-any': 'off',

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

            /* Node */
            'n/no-missing-import': 'off',
            'n/no-unsupported-features/es-syntax': 'off',

            /* Promis */
            'promise/catch-or-return': 'warn',
            'promise/always-return': 'off',

            /* „Fire-and-forget“-Promises `void` */
            'no-void': ['warn', { allowAsStatement: true }],
        },

        settings: {
            'import/resolver': {
                typescript: {
                    alwaysTryTypes: true,
                },
                node: true,
            },
        },
    },

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
