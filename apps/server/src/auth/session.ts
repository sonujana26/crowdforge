import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import type { RequestHandler } from 'express';
declare module 'express-session' {
  interface SessionData {
    creator?: boolean;
    csrf?: string;
    oauthState?: string;
    oauthAt?: number;
  }
}
export const csrfToken = () => randomBytes(32).toString('hex');
export function sameSecret(a: string, b: string) {
  return timingSafeEqual(
    createHash('sha256').update(a).digest(),
    createHash('sha256').update(b).digest(),
  );
}
export const requireCreator: RequestHandler = (req, res, next) => {
  if (!req.session.creator) {
    res.status(401).json({ code: 'AUTH_REQUIRED', message: 'Unlock creator controls first.' });
    return;
  }
  next();
};
