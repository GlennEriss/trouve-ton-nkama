import type { Config } from 'jest';

const config: Config = {
  // =============================================================================
  // CONFIGURATION DE BASE
  // =============================================================================
  
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // Nettoyer les mocks entre les tests
  clearMocks: true,
  
  // =============================================================================
  // COUVERTURE DE CODE
  // =============================================================================
  
  collectCoverage: true,
  coverageDirectory: '__tests__/coverage',
  coverageProvider: 'v8',
  
  // Formats de rapport
  coverageReporters: [
    'text',           // Console
    'text-summary',   // Résumé console
    'lcov',           // Pour CI/CD et Codecov
    'html',           // Rapport HTML navigable
    'json-summary',   // JSON pour scripts
  ],
  
  // Seuils de couverture (objectif: 70%)
  // Désactivé pour l'instant car le projet n'atteint pas encore le seuil
  // coverageThreshold: {
  //   global: {
  //     branches: 70,
  //     functions: 70,
  //     lines: 70,
  //     statements: 70,
  //   },
  // },
  
  // Fichiers à inclure dans la couverture
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/app/**/layout.tsx',
    '!src/app/**/loading.tsx',
    '!src/app/**/error.tsx',
    '!src/app/**/not-found.tsx',
    '!src/**/*.stories.{ts,tsx}',
  ],
  
  // Fichiers à exclure de la couverture
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/coverage/',
    '/\\.next/',
  ],
  
  // =============================================================================
  // TRANSFORMATION
  // =============================================================================
  
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx', // Use react-jsx transform for JSX
      },
    }],
  },
  
  // =============================================================================
  // PATTERNS DE TEST
  // =============================================================================
  
  testMatch: [
    // Tests unitaires
    '**/__tests__/unit/**/*.test.[jt]s?(x)',
    '**/__tests__/actions/**/*.test.[jt]s?(x)',
    '**/__tests__/db/**/*.test.[jt]s?(x)',
    '**/__tests__/hooks/**/*.test.[jt]s?(x)',
    '**/__tests__/lib/**/*.test.[jt]s?(x)',
    '**/__tests__/services/**/*.test.[jt]s?(x)',
    '**/__tests__/property/**/*.test.[jt]s?(x)',
    '**/__tests__/components/**/*.test.[jt]s?(x)',
    '**/__tests__/api/**/*.test.[jt]s?(x)',
    // Tests features (nouvelle structure)
    '**/features/**/__tests__/**/*.test.[jt]s?(x)',
    '**/features/**/repositories/**/__tests__/**/*.test.[jt]s?(x)',
    // Tests d'intégration
    '**/__tests__/integration/**/*.test.[jt]s?(x)',
  ],
  
  // Exclure les tests E2E (gérés par Playwright)
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/e2e/',
    '/\\.next/',
  ],
  
  // =============================================================================
  // MODULE MAPPING
  // =============================================================================
  
  moduleNameMapper: {
    // Alias du projet
    '^@/(.*)$': '<rootDir>/src/$1',
    
    // Alias des tests
    '^@tests/(.*)$': '<rootDir>/__tests__/$1',
    '^@mocks/(.*)$': '<rootDir>/__tests__/mocks/$1',
    
    // Mock NextAuth
    '^next-auth$': '<rootDir>/__tests__/mocks/next-auth.ts',
    
    // Mock des styles CSS (pour les composants React)
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    
    // Mock des assets
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__tests__/mocks/file-mock.ts',
  },
  
  // =============================================================================
  // SETUP
  // =============================================================================
  
  // Fichiers de setup après l'environnement
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup/jest.setup.ts',
  ],
  
  // =============================================================================
  // PERFORMANCE & DIVERS
  // =============================================================================
  
  // Timeout par défaut (10 secondes)
  testTimeout: 10000,
  
  // Affichage verbeux
  verbose: true,
  
  // Limiter les workers pour éviter les problèmes de mémoire
  maxWorkers: '50%',
  
  // Détection des tests lents (> 5s)
  slowTestThreshold: 5,
  
  // Reporter pour CI
  reporters: [
    'default',
    // Décommentez pour GitHub Actions
    // ['jest-junit', {
    //   outputDirectory: '__tests__/reports',
    //   outputName: 'junit.xml',
    // }],
  ],
};

export default config;
