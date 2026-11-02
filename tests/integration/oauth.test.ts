import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createService } from '../../apps/server/src/app';
import type { Config } from '../../apps/server/src/config';
const config: Config = {
  production: false,
  port: 0,
  baseUrl: 'http://localhost:4000',
  clientOrigin: 'http://localhost:5173',
  sessionSecret: 'test-session',
  creatorPassword: 'test-password',
  demoAllowed: false,
};
afterEach(() => vi.unstubAllEnvs());
describe('OAuth boundary', () => {
  it('requests only read scope, binds state to session and consumes it once', async () => {
    vi.stubEnv('TWITCH_CLIENT_ID', 'test-client');
    vi.stubEnv('TWITCH_CLIENT_SECRET', 'private-test-secret');
    vi.stubEnv('TWITCH_REDIRECT_URI', 'http://localhost:4000/auth/twitch/callback');
    const s = createService(config);
    const connect = vi.spyOn(s.twitch, 'connect').mockResolvedValue();
    try {
      const agent = request.agent(s.app);
      let csrf = (await agent.get('/api/session')).body.csrf as string;
      const login = await agent
        .post('/api/session/login')
        .set('Origin', config.baseUrl)
        .set('x-csrf-token', csrf)
        .send({ password: config.creatorPassword });
      csrf = login.body.csrf;
      expect((await agent.get('/auth/twitch').set('sec-fetch-site', 'cross-site')).status).toBe(
        403,
      );
      const redirect = await agent.get('/auth/twitch');
      const url = new URL(redirect.headers.location!);
      expect(url.searchParams.get('scope')).toBe('user:read:chat');
      const state = url.searchParams.get('state')!;
      expect(state.length).toBeGreaterThanOrEqual(32);
      expect(
        (await request(s.app).get(`/auth/twitch/callback?code=test&state=${state}`)).status,
      ).toBe(401);
      const callbacks = await Promise.all([
        agent.get(`/auth/twitch/callback?code=test&state=${state}`),
        agent.get(`/auth/twitch/callback?code=test&state=${state}`),
      ]);
      expect(callbacks.map((r) => r.status).sort()).toEqual([302, 400]);
      expect(connect).toHaveBeenCalledTimes(1);
      expect(
        (
          await agent
            .post('/api/demo/mode')
            .set('Origin', config.baseUrl)
            .set('x-csrf-token', csrf)
            .send({ enabled: true })
        ).status,
      ).toBe(403);
      for (const path of [
        '/api/game/start',
        '/api/game/pause',
        '/api/game/resume',
        '/api/game/stop',
        '/api/game/reset',
        '/api/game/advance',
        '/api/settings',
        '/api/demo/inject',
        '/api/game/telemetry',
        '/api/twitch/disconnect',
      ])
        expect((await request(s.app).post(path).send({})).status).toBe(403);
      const cookie = login.headers['set-cookie']?.toString() || '';
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).not.toContain('private-test-secret');
    } finally {
      await s.close();
    }
  });
  it('issues Secure cookies behind the configured production proxy', async () => {
    const s = createService({
      ...config,
      production: true,
      baseUrl: 'https://example.test',
      clientOrigin: 'https://example.test',
    });
    try {
      const response = await request(s.app).get('/api/session').set('X-Forwarded-Proto', 'https');
      expect(response.headers['set-cookie']?.toString()).toContain('Secure');
      expect(response.headers['content-security-policy']).toContain("script-src 'self'");
    } finally {
      await s.close();
    }
  });
});
