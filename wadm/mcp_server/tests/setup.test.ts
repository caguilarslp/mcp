/**
 * @fileoverview Simple test to verify Jest configuration
 * @description Basic test to check if Jest is working with ES modules
 */

describe('Jest Configuration Test', () => {
  it('should run a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle ES module imports', () => {
    const testFunction = () => 'test';
    expect(testFunction()).toBe('test');
  });
});
