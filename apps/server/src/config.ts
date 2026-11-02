import { randomBytes } from 'node:crypto';
export interface Config {
  production: boolean;
  port: number;
  baseUrl: string;
  clientOrigin: string;
  sessionSecret: string;
  creatorPassword: string;
  demoAllowed: boolean;
}
export function readConfig(): Config {
  const production = process.env.NODE_ENV === 'production';
  const sessionSecret = process.env.SESSION_SECRET || randomBytes(48).toString('hex');
  const creatorPassword = process.env.CREATOR_PASSWORD || '';
  if (
    production &&
    (!process.env.SESSION_SECRET || sessionSecret.length < 32 || creatorPassword.length < 16)
  )
    throw new Error(
      'Set SESSION_SECRET (32+ characters) and CREATOR_PASSWORD (16+ characters) for production.',
    );
  const port = Number(process.env.PORT || 4000);
  const baseUrl = new URL(process.env.APP_BASE_URL || 'http://localhost:4000');
  const clientOrigin = new URL(
    process.env.CLIENT_ORIGIN || (production ? baseUrl.origin : 'http://localhost:5173'),
  );
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('PORT must be an integer from 1 to 65535.');
  for (const url of [baseUrl, clientOrigin])
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
      throw new Error('App origins must be HTTP(S) URLs without credentials.');
  if (production && (baseUrl.protocol !== 'https:' || clientOrigin.origin !== baseUrl.origin))
    throw new Error('Production requires HTTPS APP_BASE_URL and the same CLIENT_ORIGIN.');
  if (process.env.DEMO_MODE_ALLOWED && !['true', 'false'].includes(process.env.DEMO_MODE_ALLOWED))
    throw new Error('DEMO_MODE_ALLOWED must be true or false.');
  return {
    production,
    port,
    baseUrl: baseUrl.origin,
    clientOrigin: clientOrigin.origin,
    sessionSecret,
    creatorPassword,
    demoAllowed: process.env.DEMO_MODE_ALLOWED !== 'false',
  };
}
