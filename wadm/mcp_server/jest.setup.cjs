// jest.setup.js
// Setup file for Jest to handle ES modules and other configurations

// Ensure proper handling of ES modules
process.env.NODE_OPTIONS = '--experimental-vm-modules';

// Global test timeout
jest.setTimeout(10000);

// Mock any problematic modules here if needed
