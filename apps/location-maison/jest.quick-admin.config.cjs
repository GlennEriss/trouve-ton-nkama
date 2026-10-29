module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
  testMatch: ['**/__tests__/admin/quick-listings-moderation.test.ts', '**/__tests__/admin/apify-quick-listing.test.ts'],
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'commonjs', jsx: 'react-jsx' } }] },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/../location-maison-admin/src/$1' },
};
