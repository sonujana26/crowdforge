import { afterEach, describe, expect, it, vi } from 'vitest';
import { Controller } from '../../apps/server/src/game/controller';
import { boundedDirector, directorInput } from '../../apps/server/src/ai/director';
import { fallback } from '../../apps/server/src/game/fallback';
import { defaultSettings, recipeSchema } from '../../apps/shared/src/contracts';
afterEach(() => vi.useRealTimers());
function state() {
  const c = new Controller();
  c.mode(true);
  c.start();
  c.ingest({
    source: 'demo',
    messageId: 'id',
    broadcasterId: 'demo',
    userId: 'SECRET-VIEWER-ID',
    displayName: 'SECRET-USER',
    text: '!forge ice',
    receivedAt: Date.now(),
  });
  const s = c.snapshot();
  c.dispose();
  return s;
}
describe('bounded AI', () => {
  it('never sends identities, activity, raw chat or credentials', () => {
    const input = JSON.stringify(directorInput(state()));
    for (const value of ['SECRET', '!forge', 'activity', 'twitch', 'token'])
      expect(input).not.toContain(value);
  });
  it('accepts only a validated model recipe and supplies the ID itself', async () => {
    const s = state();
    const { recipeId: _id, ...output } = fallback(['ice'], defaultSettings);
    void _id;
    const generate = vi.fn(async () => output);
    const r = await boundedDirector(generate)(s);
    expect(r.source).toBe('ai');
    expect(recipeSchema.safeParse(r.recipe).success).toBe(true);
    expect(generate).toHaveBeenCalledOnce();
  });
  it.each([
    { effectIds: ['execute_code'] },
    { intensity: 'extreme' },
    { durationSeconds: 999 },
    { title: '<img src=x>' },
    { effectIds: ['burning_zones'], ingredientIds: ['fire'] },
    { physics: { speed: 999 } },
  ])('falls back for invalid or incompatible output %j', async (patch) => {
    const s = state();
    const { recipeId: _id, ...output } = fallback(['ice'], defaultSettings);
    void _id;
    const r = await boundedDirector(async () => ({ ...output, ...patch }))(s);
    expect(r.source).toBe('fallback');
    expect(r.recipe.effectIds).toEqual(['slippery_floor']);
  });
  it('aborts a hung request and completes the round using fallback', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const c = new Controller(
      undefined,
      boundedDirector(async (_input, s) => {
        signal = s;
        return new Promise(() => {});
      }, 50),
    );
    c.mode(true);
    c.start();
    c.ingest({
      source: 'demo',
      messageId: 'a',
      broadcasterId: 'demo',
      userId: 'a',
      displayName: 'demo',
      text: '!forge storm',
      receivedAt: Date.now(),
    });
    c.advance();
    await vi.advanceTimersByTimeAsync(51);
    expect(signal?.aborted).toBe(true);
    expect(c.state.phase).toBe('REVEAL');
    expect(c.state.recipeSource).toBe('fallback');
    await vi.advanceTimersByTimeAsync(33000);
    expect(c.state.phase).toBe('RESULT');
    c.dispose();
  });
  it('skips provider for zero votes or missing configuration', async () => {
    const generate = vi.fn();
    const s = state();
    s.topIngredientIds = [];
    expect((await boundedDirector(generate)(s)).source).toBe('fallback');
    expect(generate).not.toHaveBeenCalled();
    expect((await boundedDirector()(state())).source).toBe('fallback');
  });
  it('provides distinct deterministic combinations', () => {
    expect(fallback(['ice', 'gravity'], defaultSettings).effectIds).toEqual([
      'slippery_floor',
      'gravity_well',
    ]);
    expect(fallback(['storm', 'mirror'], defaultSettings).title).toBe('REFRACTION STORM');
    expect(fallback(['fire', 'clones'], defaultSettings).effectIds).toEqual([
      'burning_zones',
      'echo_enemies',
    ]);
  });
});
