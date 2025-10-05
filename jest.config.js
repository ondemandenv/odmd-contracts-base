module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.test.ts'],
    transform: { '^.+\\.tsx?$': [
        'ts-jest',
        {
            tsconfig: 'tsconfig.test.json'
        }
    ] },
    verbose: true,
};
