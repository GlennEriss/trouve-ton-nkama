/**
 * Auth UI Components Export
 * 
 * Versioned export for authentication UI components.
 * Currently exports V1 components.
 * 
 * Note: Version selection is handled at runtime by the components themselves.
 * All versions are exported, and components use NEXT_PUBLIC_UI_VERSION to determine which to use.
 */

// Export V1 components (current version)
export * from './v1';

// Future: When V2 is ready, uncomment and components will select version at runtime
// export * from './v2';
