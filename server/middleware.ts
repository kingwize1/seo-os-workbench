import type { NextFunction, Request, Response } from 'express';
import { hasRolePermission } from '../shared/policyEngine';
import type { BusinessWorkspace, Entitlement, Membership, Organization, User } from '../shared/types';
import type { Repositories } from './repositories';

export const SESSION_COOKIE_NAME = 'seo_os_session';

export interface AuthLocals {
  user: User;
  organization: Organization | null;
  membership: Membership | null;
  businessWorkspace: BusinessWorkspace | null;
  entitlement: Entitlement | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthLocals;
    }
  }
}

export function extractSessionToken(req: Request): string | null {
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
  if (typeof cookieToken === 'string' && cookieToken.length > 0) return cookieToken;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

export function createSessionMiddleware(repos: Repositories) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const token = extractSessionToken(req);
    if (token) {
      const ctx = repos.getSessionContext(token);
      if (ctx) {
        req.auth = ctx;
      }
    }
    next();
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.auth?.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

export function requireBusinessEntitlement(req: Request, res: Response, next: NextFunction) {
  if (!req.auth?.user || !req.auth.organization || !req.auth.membership) {
    res.status(401).json({ error: 'Organization authentication required' });
    return;
  }
  const ent = req.auth.entitlement;
  if (!ent || (ent.status !== 'TRIAL_INCLUDED' && ent.status !== 'ACTIVE')) {
    res.status(402).json({
      error: 'Active Business Workspace entitlement required ($997 setup fee with verified webhook).',
      entitlementStatus: ent?.status ?? 'INACTIVE',
    });
    return;
  }
  next();
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.auth?.membership?.role;
    if (!role || !hasRolePermission(role, permission)) {
      res.status(403).json({
        error: `Forbidden: role "${role ?? 'NONE'}" lacks required permission "${permission}".`,
      });
      return;
    }
    next();
  };
}

// --- Lightweight In-Memory Rate Limiter ---
export function createRateLimiter(maxRequestsPerMinute = 180) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'test') {
      next();
      return;
    }
    const key = req.ip || 'local';
    const now = Date.now();
    const bucket = hits.get(key);
    if (!bucket || bucket.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + 60_000 });
      next();
      return;
    }
    bucket.count += 1;
    if (bucket.count > maxRequestsPerMinute) {
      res.status(429).json({ error: 'Rate limit exceeded. Please retry shortly.' });
      return;
    }
    next();
  };
}
