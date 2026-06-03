import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

describe('Shared package setup', () => {
  it('should have fast-check configured correctly', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return typeof n === 'number';
      }),
      { numRuns: 100 }
    );
  });

  it('should export from index', async () => {
    const shared = await import('./index');
    expect(shared).toBeDefined();
  });
});
