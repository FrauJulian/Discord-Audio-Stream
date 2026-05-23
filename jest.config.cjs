/** @type {import('jest').Config} */
module.exports = {
    clearMocks: true,
    moduleFileExtensions: ['ts', 'js', 'json'],
    testEnvironment: 'node',
    testMatch: ['<rootDir>/tests/**/*.test.ts'],
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                tsconfig: '<rootDir>/tsconfig.test.json',
            },
        ],
    },
};
