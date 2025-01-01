module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    testMatch: ['**/tmp*.test.ts'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },
    verbose: true,
};
