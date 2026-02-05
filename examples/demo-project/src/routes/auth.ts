/**
 * Authentication Routes
 *
 * API endpoints for login, register, and token refresh.
 */

import { Router, Request, Response } from 'express';
import { createUser, verifyCredentials, getUserById } from '../users/repository';
import { createToken, verifyToken, isTokenExpiringSoon } from '../auth/jwt';
import { requireAuth, AuthenticatedRequest } from '../auth/middleware';
import { checkPasswordStrength } from '../users/password';

const router = Router();

/**
 * POST /auth/register
 * Create a new user account
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check password strength
    const strength = checkPasswordStrength(password);
    if (strength.score < 3) {
      return res.status(400).json({
        error: 'Password too weak',
        feedback: strength.feedback,
      });
    }

    const user = await createUser({ email, password });
    const token = createToken(user);

    res.status(201).json({
      user: { id: user.id, email: user.email, role: user.role },
      token,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Email already registered') {
      return res.status(409).json({ error: error.message });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /auth/login
 * Authenticate and receive a token
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await verifyCredentials(email, password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = createToken(user);

    res.json({
      user: { id: user.id, email: user.email, role: user.role },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /auth/refresh
 * Refresh an expiring token (requires auth)
 */
router.post('/refresh', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token || !isTokenExpiringSoon(token)) {
      return res.status(400).json({ error: 'Token refresh not needed' });
    }

    const user = await getUserById(req.user!.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const newToken = createToken(user);

    res.json({ token: newToken });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

/**
 * GET /auth/me
 * Get current user info (requires auth)
 */
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

export default router;
