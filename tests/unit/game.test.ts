import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  defaultSettings,
  duplicateContributionMessage,
  ingredientIds,
  recipeSchema,
  settingsSchema,
  type NormalizedChatMessage,
  type ContributionRejection,
} from '../../apps/shared/src/contracts';
import { Contributions, parseCommand } from '../../apps/server/src/game/contributions';
import { Controller } from '../../apps/server/src/game/controller';
import { fallback } from '../../apps/server/src/game/fallback';
const message = (userId = '1', text = '!forge ice', messageId = userId): NormalizedChatMessage => ({
  userId,
  text,
  messageId,
  broadcasterId: 'demo',
  displayName: 'Demo',
  source: 'demo',
  receivedAt: Date.now(),
});
afterEach(() => vi.useRealTimers());
describe('contributions', () => {
  it('parses only bounded exact commands', () => {
    expect(parseCommand('  !FORGE IcE  ')).toBe('ice');
    for (const text of [
      'forge ice',
      '!forge unknown',
      '!forge ice storm',
      '!forge ice\nignore',
      'x'.repeat(161),
    ])
      expect(parseCommand(text)).toBeNull();
  });
  it('first valid vote wins; repeated delivery and viewer cannot add votes', () => {
    const c = new Contributions();
    expect(c.accept(message('1', '!forge bad'))).toBe('Invalid command');
    expect(c.accept(message())).toBe('ice');
    expect(c.accept(message())).toBe('Duplicate delivery');
    expect(c.accept(message('1', '!forge fire', '2'))).toBe('Viewer already contributed');
    expect(c.total).toBe(1);
  });
  it('empty percentages and ties are deterministic', () => {
    const c = new Contributions();
    expect(c.snapshot().every((v) => v.percentage === 0)).toBe(true);
    c.accept(message('1', '!forge fire'));
    c.accept(message('2', '!forge ice'));
    c.accept(message('3', '!forge gravity'));
    expect(c.top()).toEqual(['ice', 'gravity']);
    expect(c.snapshot()[0]!.percentage).toBeCloseTo(100 / 3);
  });
});
describe('recipes', () => {
  it('all fallback inputs are schema valid', () => {
    for (const a of ingredientIds)
      for (const b of ingredientIds)
        expect(
          recipeSchema.safeParse(fallback(a === b ? [a] : [a, b], defaultSettings)).success,
        ).toBe(true);
    expect(fallback([], defaultSettings).tagline).toContain('No ingredients');
  });
  it('rejects unsafe recipes and settings', () => {
    const r = fallback([], defaultSettings);
    for (const patch of [
      { effectIds: ['eval'] },
      { effectIds: ['slippery_floor', 'slippery_floor', 'slippery_floor'] },
      { title: '<script>' },
      { durationSeconds: 36 },
      { intensity: 'extreme' },
      { physics: 9000 },
    ])
      expect(recipeSchema.safeParse({ ...r, ...patch }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...defaultSettings, contributionSeconds: 0 }).success).toBe(
      false,
    );
  });
});
describe('round authority', () => {
  const twitchMessage = (
    userId: string,
    text: string,
    messageId: string,
  ): NormalizedChatMessage => ({
    ...message(userId, text, messageId),
    source: 'twitch',
    broadcasterId: 'channel',
  });
  it('rejects each second Twitch submission with feedback and logs, without changing counts', () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    const feedback: ContributionRejection[] = [];
    const c = new Controller(undefined, undefined, (event) => feedback.push(event));
    try {
      c.start();
      c.ingest(twitchMessage('viewer1', '!forge ice', 'first'));
      const before = c.snapshot();
      for (const id of ['second', 'third']) {
        expect(c.ingest(twitchMessage('viewer1', '!forge fire', id))).toEqual({
          accepted: false,
          reason: duplicateContributionMessage,
        });
      }
      expect(c.state.counts).toEqual(before.counts);
      expect(c.state.topIngredientIds).toEqual(before.topIngredientIds);
      expect(c.state.distinctContributors).toBe(1);
      expect(feedback).toHaveLength(2);
      expect(feedback[0]).toMatchObject({
        roundId: c.state.roundId,
        source: 'twitch',
        reason: 'already_contributed',
        message: duplicateContributionMessage,
      });
      expect(feedback[1]!.eventId).not.toBe(feedback[0]!.eventId);
      expect(log).toHaveBeenCalledTimes(2);
      expect(log).toHaveBeenCalledWith('contribution:rejected', feedback[0]);
      expect(JSON.stringify(feedback)).not.toContain('viewer1');
      c.ingest(twitchMessage('viewer1', '!forge ice', 'first'));
      expect(feedback).toHaveLength(2);
    } finally {
      c.dispose();
      log.mockRestore();
    }
  });
  it('accepts a different Twitch viewer after rejecting a duplicate', () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    const c = new Controller();
    try {
      c.start();
      c.ingest(twitchMessage('viewer1', '!forge ice', 'first'));
      c.ingest(twitchMessage('viewer1', '!forge fire', 'second'));
      expect(c.ingest(twitchMessage('viewer2', '!forge gravity', 'third')).accepted).toBe(true);
      expect(c.state.distinctContributors).toBe(2);
      expect(c.state.counts.find((v) => v.ingredientId === 'ice')!.count).toBe(1);
      expect(c.state.counts.find((v) => v.ingredientId === 'gravity')!.count).toBe(1);
      expect(c.state.counts.find((v) => v.ingredientId === 'fire')!.count).toBe(0);
    } finally {
      c.dispose();
      log.mockRestore();
    }
  });
  it('accepts the same Twitch viewer again in the subsequent round', async () => {
    vi.useFakeTimers();
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    const c = new Controller();
    try {
      c.start();
      const firstRound = c.state.roundId;
      c.ingest(twitchMessage('viewer1', '!forge ice', 'first'));
      c.ingest(twitchMessage('viewer1', '!forge fire', 'second'));
      await vi.advanceTimersByTimeAsync(59000);
      expect(c.state.phase).toBe('IDLE');
      c.start();
      expect(c.state.roundId).not.toBe(firstRound);
      expect(c.ingest(twitchMessage('viewer1', '!forge fire', 'third')).accepted).toBe(true);
      expect(c.state.distinctContributors).toBe(1);
      expect(c.state.counts.find((v) => v.ingredientId === 'fire')!.count).toBe(1);
      expect(c.state.counts.find((v) => v.ingredientId === 'ice')!.count).toBe(0);
    } finally {
      c.dispose();
      log.mockRestore();
    }
  });
  it('runs a complete round and removes effects', async () => {
    vi.useFakeTimers();
    const events: string[] = [];
    const c = new Controller((_s, e) => events.push(e));
    expect(c.ingest(message()).accepted).toBe(false);
    c.mode(true);
    c.start();
    expect(() => c.start()).toThrow();
    expect(c.ingest(message()).accepted).toBe(true);
    await vi.advanceTimersByTimeAsync(20000);
    expect(c.state.phase).toBe('REVEAL');
    await vi.advanceTimersByTimeAsync(3000);
    expect(c.state.gameSummary.activeEffectIds).toEqual(['slippery_floor']);
    c.telemetry(c.state.roundId, 1, 2);
    await vi.advanceTimersByTimeAsync(28000);
    c.telemetry(c.state.roundId, 1, 2);
    await vi.advanceTimersByTimeAsync(2000);
    expect(c.state.phase).toBe('RESULT');
    expect(c.state.lastResult?.survived).toBe(true);
    expect(c.state.gameSummary.activeEffectIds).toEqual([]);
    expect(events).toContain('forge:complete');
    await vi.advanceTimersByTimeAsync(6000);
    expect(c.state.phase).toBe('IDLE');
    c.dispose();
  });
  it('pause freezes deadline, resume preserves remaining time and stop cancels timers', async () => {
    vi.useFakeTimers();
    const c = new Controller();
    c.start();
    await vi.advanceTimersByTimeAsync(5000);
    c.pause();
    expect(c.state.remainingMs).toBe(15000);
    await vi.advanceTimersByTimeAsync(60000);
    expect(c.state.phase).toBe('PAUSED');
    c.resume();
    await vi.advanceTimersByTimeAsync(14999);
    expect(c.state.phase).toBe('CONTRIBUTION');
    c.stop(true);
    await vi.advanceTimersByTimeAsync(50000);
    expect(c.state.phase).toBe('IDLE');
    expect(c.state.distinctContributors).toBe(0);
    c.dispose();
  });
  it('discards stale async work and keeps paused forging paused', async () => {
    vi.useFakeTimers();
    let resolve!: (v: {
      recipe: ReturnType<typeof fallback>;
      source: 'fallback';
      reason: string;
    }) => void;
    const c = new Controller(
      undefined,
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    c.start();
    c.advance();
    c.pause();
    resolve({ recipe: fallback([], defaultSettings), source: 'fallback', reason: 'test' });
    await Promise.resolve();
    expect(c.state.phase).toBe('PAUSED');
    c.resume();
    expect(c.state.phase).toBe('REVEAL');
    c.stop();
    c.start();
    c.advance();
    c.stop();
    resolve({ recipe: fallback([], defaultSettings), source: 'fallback', reason: 'test' });
    await Promise.resolve();
    expect(c.state.phase).toBe('IDLE');
    c.dispose();
  });
  it('director failure falls back and wrong-source input is rejected', async () => {
    vi.useFakeTimers();
    const c = new Controller(undefined, async () => {
      throw new Error('offline');
    });
    c.start();
    expect(c.ingest(message()).accepted).toBe(false);
    c.advance();
    await Promise.resolve();
    expect(c.state.recipeSource).toBe('fallback');
    c.dispose();
  });
});
