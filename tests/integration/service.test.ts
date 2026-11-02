import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  duplicateContributionMessage,
  type ContributionRejection,
} from '../../apps/shared/src/contracts';
import request from 'supertest';
import { io as client } from 'socket.io-client';
import { createService } from '../../apps/server/src/app';
import type { Config } from '../../apps/server/src/config';
const config: Config = {
  production: false,
  port: 0,
  baseUrl: 'http://localhost:4000',
  clientOrigin: 'http://localhost:5173',
  sessionSecret: 'test-secret-not-real',
  creatorPassword: 'test-password',
  demoAllowed: true,
};
const services: ReturnType<typeof createService>[] = [];
afterEach(async () => {
  for (const s of services) await s.close();
  services.length = 0;
});
function setup() {
  const s = createService(config);
  services.push(s);
  return s;
}
async function login(s: ReturnType<typeof createService>) {
  const agent = request.agent(s.app);
  const session = await agent.get('/api/session');
  const response = await agent
    .post('/api/session/login')
    .set('Origin', config.baseUrl)
    .set('x-csrf-token', session.body.csrf)
    .send({ password: config.creatorPassword });
  expect(response.status).toBe(200);
  return {
    agent,
    post: (path: string, body: object = {}) =>
      agent
        .post(path)
        .set('Origin', config.baseUrl)
        .set('x-csrf-token', response.body.csrf)
        .send(body),
  };
}
describe('protected local slice', () => {
  it('broadcasts duplicate feedback to dashboard and overlay sockets without altering votes', async () => {
    const s = setup();
    await new Promise<void>((r) => s.http.listen(0, '127.0.0.1', r));
    const address = s.http.address() as { port: number };
    const viewers = [0, 1].map(() =>
      client(`http://127.0.0.1:${address.port}`, { autoConnect: false }),
    );
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    try {
      await Promise.all(
        viewers.map(
          (socket) =>
            new Promise<void>((resolve) => {
              socket.once('state:snapshot', () => resolve());
              socket.connect();
            }),
        ),
      );
      s.controller.start();
      const message = {
        source: 'twitch' as const,
        broadcasterId: 'channel',
        userId: 'private-viewer',
        displayName: 'Private',
        receivedAt: Date.now(),
        messageId: 'first',
        text: '!forge ice',
      };
      s.controller.ingest(message);
      const before = s.controller.snapshot();
      const events = viewers.map(
        (socket) =>
          new Promise<ContributionRejection>((resolve, reject) => {
            const timeout = setTimeout(
              () => reject(new Error('Missing duplicate feedback event')),
              2000,
            );
            socket.once('contribution:rejected', (event: ContributionRejection) => {
              clearTimeout(timeout);
              resolve(event);
            });
          }),
      );
      expect(
        s.controller.ingest({ ...message, messageId: 'second', text: '!forge fire' }).accepted,
      ).toBe(false);
      const delivered = await Promise.all(events);
      expect(delivered[0]).toEqual(delivered[1]);
      expect(delivered[0]).toMatchObject({
        roundId: before.roundId,
        source: 'twitch',
        message: duplicateContributionMessage,
        reason: 'already_contributed',
      });
      expect(JSON.stringify(delivered)).not.toContain('private-viewer');
      expect(s.controller.state.counts).toEqual(before.counts);
      expect(s.controller.state.distinctContributors).toBe(1);
      expect(log).toHaveBeenCalledWith('contribution:rejected', delivered[0]);
    } finally {
      viewers.forEach((socket) => socket.disconnect());
      log.mockRestore();
    }
  });
  it('rejects missing/mismatched OAuth state and leaves live setup honest', async () => {
    const s = setup();
    const { agent } = await login(s);
    const response = await agent.get('/auth/twitch/callback?code=bogus&state=wrong');
    expect(response.status).toBe(400);
    expect((await agent.get('/auth/twitch')).status).toBe(503);
    expect(s.controller.state.twitch.state).toBe('Authentication required');
  });
  it('rejects unauthenticated controls and cross-site changes', async () => {
    const s = setup();
    expect((await request(s.app).post('/api/game/start')).status).toBe(403);
    const agent = request.agent(s.app);
    const session = await agent.get('/api/session');
    expect(
      (
        await agent
          .post('/api/game/start')
          .set('Origin', config.baseUrl)
          .set('x-csrf-token', session.body.csrf)
      ).status,
    ).toBe(401);
    const { agent: authed } = await login(s);
    expect(
      (await authed.post('/api/game/start').set('Origin', 'https://evil.example')).status,
    ).toBe(403);
  });
  it('guards demo mode and completes the contribution/recipe HTTP flow', async () => {
    const s = setup();
    const { post } = await login(s);
    expect((await post('/api/demo/inject', { viewer: 1, text: '!forge ice' })).status).toBe(403);
    await post('/api/demo/mode', { enabled: true });
    await post('/api/game/start');
    expect((await post('/api/demo/inject', { viewer: 1, text: '!forge ice' })).body.accepted).toBe(
      true,
    );
    expect((await post('/api/demo/inject', { viewer: 1, text: '!forge fire' })).body.accepted).toBe(
      false,
    );
    await post('/api/game/advance');
    expect(s.controller.state.phase).toBe('REVEAL');
    expect(s.controller.state.recipeSource).toBe('fallback');
    await post('/api/game/stop');
    expect(s.controller.state.phase).toBe('IDLE');
  });
  it('public responses never expose server secrets or viewer identifiers', async () => {
    const s = setup();
    for (const path of ['/api/game/state', '/api/public-config', '/api/twitch/status']) {
      const response = await request(s.app).get(path);
      const text = JSON.stringify(response.body);
      expect(text).not.toContain(config.sessionSecret);
      expect(text).not.toContain(config.creatorPassword);
      expect(text).not.toContain('userId');
    }
  });
  it('sends authoritative snapshots on initial connection and reconnect', async () => {
    const s = setup();
    await new Promise<void>((r) => s.http.listen(0, '127.0.0.1', r));
    const address = s.http.address() as { port: number };
    const socket = client(`http://127.0.0.1:${address.port}`, { autoConnect: false });
    try {
      const snapshot = () =>
        new Promise<{ roundNumber: number }>((r) => socket.once('state:snapshot', r));
      let ready = snapshot();
      socket.connect();
      expect((await ready).roundNumber).toBe(0);
      socket.disconnect();
      s.controller.start();
      ready = snapshot();
      socket.connect();
      expect((await ready).roundNumber).toBe(1);
    } finally {
      socket.disconnect();
    }
  });
});
