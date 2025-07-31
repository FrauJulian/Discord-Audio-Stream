module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/Unittests.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};
