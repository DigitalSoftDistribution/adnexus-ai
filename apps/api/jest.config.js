module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^openai$': '<rootDir>/tests/__mocks__/openai.js',
    '^@sendgrid/mail$': '<rootDir>/tests/__mocks__/sendgrid.js',
    '^puppeteer$': '<rootDir>/tests/__mocks__/puppeteer.js',
    '^canvas$': '<rootDir>/tests/__mocks__/canvas.js',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  testTimeout: 10000,
  transform: {
    '^.+\\.(ts|js)$': ['ts-jest', {
      isolatedModules: true,
      diagnostics: {
        ignoreCodes: [2345, 2322, 2769, 2740, 2554],
      },
    }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(.*\\.mjs$))',
  ],
};
