import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateUsername, validatePassword } from './authService.js';

// Mock the database module
vi.mock('../config/database.js', () => ({
  query: vi.fn(),
}));

describe('Auth Service - Validation', () => {
  describe('validateUsername', () => {
    it('should accept valid alphanumeric usernames between 3-20 chars', () => {
      expect(validateUsername('abc')).toEqual({ valid: true });
      expect(validateUsername('user123')).toEqual({ valid: true });
      expect(validateUsername('Player1')).toEqual({ valid: true });
      expect(validateUsername('a'.repeat(20))).toEqual({ valid: true });
    });

    it('should reject usernames shorter than 3 characters', () => {
      const result = validateUsername('ab');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('between 3 and 20');
    });

    it('should reject usernames longer than 20 characters', () => {
      const result = validateUsername('a'.repeat(21));
      expect(result.valid).toBe(false);
      expect(result.error).toContain('between 3 and 20');
    });

    it('should reject usernames with non-alphanumeric characters', () => {
      expect(validateUsername('user_name').valid).toBe(false);
      expect(validateUsername('user name').valid).toBe(false);
      expect(validateUsername('user@name').valid).toBe(false);
      expect(validateUsername('user-name').valid).toBe(false);
      expect(validateUsername('user.name').valid).toBe(false);
    });

    it('should reject empty or missing username', () => {
      expect(validateUsername('').valid).toBe(false);
      expect(validateUsername(null as unknown as string).valid).toBe(false);
      expect(validateUsername(undefined as unknown as string).valid).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should accept passwords with 8 or more characters', () => {
      expect(validatePassword('12345678')).toEqual({ valid: true });
      expect(validatePassword('a'.repeat(100))).toEqual({ valid: true });
      expect(validatePassword('P@ssw0rd!')).toEqual({ valid: true });
    });

    it('should reject passwords shorter than 8 characters', () => {
      const result = validatePassword('1234567');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 8');
    });

    it('should reject empty or missing password', () => {
      expect(validatePassword('').valid).toBe(false);
      expect(validatePassword(null as unknown as string).valid).toBe(false);
      expect(validatePassword(undefined as unknown as string).valid).toBe(false);
    });
  });
});

describe('Auth Service - Token Validation', () => {
  let authService: typeof import('./authService.js');

  beforeEach(async () => {
    vi.resetModules();
    authService = await import('./authService.js');
  });

  it('should reject invalid access tokens', () => {
    expect(() => authService.validateAccessToken('invalid-token')).toThrow('Invalid access token');
  });

  it('should reject empty access tokens', () => {
    expect(() => authService.validateAccessToken('')).toThrow();
  });
});
