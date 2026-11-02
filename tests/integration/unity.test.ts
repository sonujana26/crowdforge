import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createService } from '../../apps/server/src/app';
describe('Unity hosting policy', () => {
  it('allows WebAssembly only on the explicit Unity view without general eval or external scripts', async () => {
    const service = createService({
      production: true,
      port: 0,
      baseUrl: 'https://example.test',
      clientOrigin: 'https://example.test',
      sessionSecret: 'test-only-session-secret',
      creatorPassword: 'test-only',
      demoAllowed: true,
    });
    const app = service.app;
    try {
      const unity = await request(app).get('/arena?renderer=unity');
      const dashboard = await request(app).get('/dashboard');
      const legacy = await request(app).get('/arena');
      expect(unity.headers['content-security-policy']).toContain("'wasm-unsafe-eval'");
      expect(unity.headers['content-security-policy']).not.toContain("'unsafe-eval'");
      expect(unity.headers['content-security-policy']).toContain("connect-src 'self'");
      expect(dashboard.headers['content-security-policy']).not.toContain('wasm-unsafe-eval');
      expect(legacy.headers['content-security-policy']).toEqual(
        dashboard.headers['content-security-policy'],
      );
    } finally {
      await service.close();
    }
  });
});
