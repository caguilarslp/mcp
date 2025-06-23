/**
 * @fileoverview Wyckoff Basic Analysis Service (Compatibility Layer)
 * @description Backward compatibility for existing imports
 * @version 2.0.0 - TASK-030 Modular Migration
 * @deprecated Use direct imports from ./wyckoff/ module instead
 */

// Re-export everything from the new modular structure
export * from './wyckoff/index.js';

// Ensure the default export is preserved
export { WyckoffBasicService as default } from './wyckoff/core/WyckoffBasicService.js';

// Migration notice (only shown once per session)
if (!(globalThis as any).__wyckoffBasicMigrationWarningShown) {
  console.warn('wyckoffBasic.ts is deprecated. Use imports from ./wyckoff/ module. See TASK-030 migration guide.');
  (globalThis as any).__wyckoffBasicMigrationWarningShown = true;
}
