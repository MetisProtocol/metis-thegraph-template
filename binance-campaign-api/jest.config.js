/** @type {import('ts-jest').JestConfigWithTsJest} **/
// eslint-disable-next-line
module.exports = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.ts$': ['ts-jest', {}],
    },
    testMatch: ['**/?(*.)+(test).ts?(x)'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
};
