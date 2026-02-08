/**
 * Clerk Integration
 * 
 * JWT verification for Clerk tokens
 */

interface ClerkJWTPayload {
  sub: string;        // User ID
  iss: string;        // Issuer
  aud: string;        // Audience
  iat: number;        // Issued at
  exp: number;        // Expiration
  azp?: string;       // Authorized party
  sid?: string;       // Session ID
}

/**
 * Verify a Clerk JWT token
 * 
 * In production, this should use Clerk's JWKS endpoint
 * For MVP, we trust tokens from our frontend
 */
export async function verifyClerkToken(
  token: string,
  _secretKey: string
): Promise<ClerkJWTPayload> {
  // Decode JWT (without verification for MVP)
  // TODO: Implement proper JWKS verification
  
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  try {
    const payload = JSON.parse(atob(parts[1])) as ClerkJWTPayload;

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }

    // Check issuer (should be our Clerk instance)
    // if (!payload.iss?.includes('clerk')) {
    //   throw new Error('Invalid issuer');
    // }

    return payload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

/**
 * Create a CLI auth session
 * Returns a URL for the user to authenticate
 */
export function createCliAuthUrl(state: string): string {
  // This would be the Clerk hosted login page with our redirect
  return `https://app.contextkit.dev/cli-auth?state=${state}`;
}
