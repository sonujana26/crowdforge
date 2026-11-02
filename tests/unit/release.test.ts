import { afterEach, describe, expect, it, vi } from 'vitest';
import type session from 'express-session';
import { Controller } from '../../apps/server/src/game/controller';
import { SessionStore } from '../../apps/server/src/auth/store';
import { readConfig } from '../../apps/server/src/config';
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
describe('release regressions', () => {
  it('clears every demo-derived result and count on mode switch', async () => {
    vi.useFakeTimers();
    const c = new Controller();
    c.mode(true);
    c.start();
    c.ingest({
      source: 'demo',
      messageId: '1',
      userId: '1',
      broadcasterId: 'demo',
      displayName: 'demo',
      text: '!forge fire',
      receivedAt: Date.now(),
    });
    await vi.advanceTimersByTimeAsync(59000);
    expect(c.state.lastResult?.distinctContributors).toBe(1);
    c.mode(false);
    expect(c.state.lastResult).toBeNull();
    expect(c.state.distinctContributors).toBe(0);
    expect(c.state.topIngredientIds).toEqual([]);
    expect(c.state.activity.some((a) => a.source === 'demo')).toBe(false);
    expect(c.state.recipeSource).toBe('none');
    c.dispose();
  });
  it('never declares survival from stale player telemetry', async () => {
    vi.useFakeTimers();
    const c = new Controller();
    c.start();
    await vi.advanceTimersByTimeAsync(23000);
    c.telemetry(c.state.roundId, 1, 0);
    await vi.advanceTimersByTimeAsync(30000);
    expect(c.state.lastResult?.survived).toBeNull();
    c.dispose();
  });
  it('health zero ends an encounter, ignores stale rounds and respects telemetry limit', async () => {
    vi.useFakeTimers();
    const c = new Controller();
    c.start();
    await vi.advanceTimersByTimeAsync(23000);
    c.telemetry('wrong', 0, 0);
    expect(c.state.phase).toBe('ENCOUNTER');
    c.telemetry(c.state.roundId, 1, 0);
    c.telemetry(c.state.roundId, 0, 0);
    expect(c.state.phase).toBe('ENCOUNTER');
    await vi.advanceTimersByTimeAsync(2000);
    c.telemetry(c.state.roundId, 0, 0);
    expect(c.state.lastResult?.survived).toBe(false);
    expect(c.state.gameSummary.activeEffectIds).toEqual([]);
    c.dispose();
  });
  it('auto-next creates one clean round without leaking contributions', async () => {
    vi.useFakeTimers();
    const c = new Controller();
    c.configure({ ...c.state.settings, autoNext: true });
    c.mode(true);
    c.start();
    c.ingest({
      source: 'demo',
      messageId: '1',
      userId: '1',
      broadcasterId: 'demo',
      displayName: 'demo',
      text: '!forge ice',
      receivedAt: Date.now(),
    });
    await vi.advanceTimersByTimeAsync(59000);
    expect(c.state.phase).toBe('CONTRIBUTION');
    expect(c.state.roundNumber).toBe(2);
    expect(c.state.distinctContributors).toBe(0);
    c.dispose();
  });
  it('rejects invalid production configuration and insecure origins', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SESSION_SECRET', 'x'.repeat(32));
    vi.stubEnv('CREATOR_PASSWORD', 'x'.repeat(16));
    vi.stubEnv('APP_BASE_URL', 'http://localhost:4000');
    expect(() => readConfig()).toThrow('HTTPS');
    vi.stubEnv('APP_BASE_URL', 'https://example.test');
    vi.stubEnv('CLIENT_ORIGIN', 'https://example.test');
    expect(readConfig().production).toBe(true);
    vi.stubEnv('PORT', 'NaN');
    expect(() => readConfig()).toThrow('PORT');
  });
  it('bounds and expires server sessions', () => {
    vi.useFakeTimers();
    const store = new SessionStore(2);
    const data = {
      cookie: { expires: new Date(Date.now() + 1000) },
      creator: true,
    } as session.SessionData;
    store.set('a', data);
    store.set('b', data);
    store.set('c', data);
    store.get('a', (_e, value) => expect(value).toBeNull());
    store.get('c', (_e, value) => expect(value?.creator).toBe(true));
    vi.advanceTimersByTime(1001);
    store.get('c', (_e, value) => expect(value).toBeNull());
    store.clear();
  });
});
