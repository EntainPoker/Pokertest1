import { describe, it, expect } from 'vitest';

describe('Server setup', () => {
  it('should have correct port configuration', () => {
    const port = process.env.PORT || 4000;
    expect(port).toBe(4000);
  });
});
