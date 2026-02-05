/**
 * JWT Token Management
 *
 * Handles creation and verification of JSON Web Tokens.
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
const TOKEN_EXPIRY = '24h';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Create a new JWT token for a user
 */
export function createToken(user: { id: string; email: string; role: string }): string {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Verify a JWT token and return the payload
 * Throws an error if the token is invalid or expired
 */
export function verifyToken(token: string): TokenPayload {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Decode a token without verification (for debugging)
 */
export function decodeToken(token: string): TokenPayload | null {
  return jwt.decode(token) as TokenPayload | null;
}

/**
 * Check if a token is close to expiring (within 1 hour)
 */
export function isTokenExpiringSoon(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload) return true;

  const expiresAt = payload.exp * 1000; // Convert to milliseconds
  const oneHourFromNow = Date.now() + 60 * 60 * 1000;

  return expiresAt < oneHourFromNow;
}
