module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/tmp*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};
