/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/examples/**',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.test.json'
      }
    ]
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'js'],
  transformIgnorePatterns: ['node_modules/(?!(@modelcontextprotocol)/)']
};