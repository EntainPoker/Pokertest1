import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import type { Player, TokenPair } from '@spin-and-go/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const SALT_ROUNDS = 10;

const invalidatedTokens = new Set<string>();

export interface AuthResult {
  player: Omit<Player, 'passwordHash'>;
  tokens: TokenPair;
}

export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }
  if (username.length < 3 || username.length > 20) {
    return { valid: false, error: 'Username must be between 3 and 20 characters' };
  }
  if (!/^[a-zA-Z0-9]+$/.test(username)) {
    return { valid: false, error: 'Username must contain only alphanumeric characters' };
  }
  return { valid: true };
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  return { valid: true };
}

function generateTokenPair(playerId: string, username: string): TokenPair {
  const accessToken = jwt.sign({ playerId, username }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign({ playerId, username, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
  return { accessToken, refreshToken };
}

function mapRowToPlayer(row: Record<string, unknown>): Omit<Player, 'passwordHash'> {
  return {
    id: row.id as string,
    username: row.username as string,
    balance: row.balance as number,
    createdAt: new Date(row.created_at as string),
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at as string) : new Date(),
    isTestAccount: Boolean(row.is_test_account),
  };
}

export async function register(username: string, password: string): Promise<AuthResult> {
  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) throw new Error(usernameValidation.error);

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) throw new Error(passwordValidation.error);

  const existingUser = query('SELECT id FROM players WHERE username = ?', [username]);
  if (existingUser.rows.length > 0) throw new Error('Username is already taken');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const id = crypto.randomUUID().replace(/-/g, '');

  query(
    `INSERT INTO players (id, username, password_hash, balance, is_test_account, created_at, last_login_at)
     VALUES (?, ?, ?, 1000, 0, datetime('now'), datetime('now'))`,
    [id, username, passwordHash]
  );

  const result = query('SELECT * FROM players WHERE id = ?', [id]);
  const player = mapRowToPlayer(result.rows[0]);
  const tokens = generateTokenPair(player.id, player.username);

  return { player, tokens };
}

export async function login(username: string, password: string): Promise<AuthResult> {
  const genericError = 'Invalid username or password';
  if (!username || !password) throw new Error(genericError);

  const result = query('SELECT * FROM players WHERE username = ?', [username]);
  if (result.rows.length === 0) throw new Error(genericError);

  const row = result.rows[0];
  const passwordValid = await bcrypt.compare(password, row.password_hash as string);
  if (!passwordValid) throw new Error(genericError);

  query(`UPDATE players SET last_login_at = datetime('now') WHERE id = ?`, [row.id]);

  const player = mapRowToPlayer(row);
  const tokens = generateTokenPair(player.id, player.username);

  return { player, tokens };
}

export async function logout(refreshToken: string): Promise<void> {
  invalidatedTokens.add(refreshToken);
}

export async function refreshToken(token: string): Promise<TokenPair> {
  if (invalidatedTokens.has(token)) throw new Error('Token has been invalidated');

  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { playerId: string; username: string; type: string };
    if (decoded.type !== 'refresh') throw new Error('Invalid token type');
    invalidatedTokens.add(token);
    return generateTokenPair(decoded.playerId, decoded.username);
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) throw new Error('Refresh token has expired');
    if (error instanceof jwt.JsonWebTokenError) throw new Error('Invalid refresh token');
    throw error;
  }
}

export function validateAccessToken(token: string): { playerId: string; username: string } {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { playerId: string; username: string };
    return { playerId: decoded.playerId, username: decoded.username };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) throw new Error('Access token has expired');
    throw new Error('Invalid access token');
  }
}
