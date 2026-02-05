/**
 * User Repository
 *
 * Database operations for user management.
 */

import { db } from '../database';
import { hashPassword, verifyPassword } from './password';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  role?: 'user' | 'admin';
}

/**
 * Find a user by their ID
 */
export async function getUserById(id: string): Promise<User | null> {
  const result = await db.query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Find a user by their email address
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await db.query(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  return result.rows[0] || null;
}

/**
 * Create a new user
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  const existingUser = await getUserByEmail(input.email);
  if (existingUser) {
    throw new Error('Email already registered');
  }

  const passwordHash = await hashPassword(input.password);

  const result = await db.query(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.email.toLowerCase(), passwordHash, input.role || 'user']
  );

  return result.rows[0];
}

/**
 * Verify user credentials
 * Returns the user if valid, null otherwise
 */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<User | null> {
  const user = await getUserByEmail(email);
  if (!user) return null;

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) return null;

  return user;
}

/**
 * Update user's password
 */
export async function updatePassword(
  userId: string,
  newPassword: string
): Promise<void> {
  const passwordHash = await hashPassword(newPassword);

  await db.query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [passwordHash, userId]
  );
}

/**
 * Delete a user by ID
 */
export async function deleteUser(id: string): Promise<boolean> {
  const result = await db.query(
    'DELETE FROM users WHERE id = $1',
    [id]
  );
  return result.rowCount > 0;
}
