import { describe, expect, it } from 'vitest';
import { createDirector } from '../../apps/server/src/ai/director';
import { defaultSettings } from '../../apps/shared/src/contracts';
import type { RoundState } from '../../apps/shared/src/contracts';

describe('Groq AI Director integration', () => {
  it('synthesizes a valid recipe using openai/gpt-oss-120b on Groq', async () => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return;
    }
    const director = createDirector(
      apiKey,
      'openai/gpt-oss-120b'
    );

    const state: RoundState = {
      roundId: 'test-groq-round',
      roundNumber: 1,
      phase: 'FORGING',
      phaseStartedAt: Date.now(),
      phaseEndsAt: null,
      remainingMs: null,
      counts: [
        { ingredientId: 'storm', count: 12, percentage: 60 },
        { ingredientId: 'fire', count: 8, percentage: 40 },
      ],
      distinctContributors: 20,
      topIngredientIds: ['storm', 'fire'],
      recipe: null,
      recipeSource: 'none',
      recipeReason: '',
      gameSummary: {
        playerHealthRatio: 1,
        enemyCount: 2,
        difficulty: 'medium',
        activeEffectIds: [],
        recentEffectIds: [],
      },
      lastResult: null,
      demoMode: false,
      settings: { ...defaultSettings },
      activity: [],
      aiConfigured: true,
      serverNow: Date.now(),
      twitch: {
        state: 'Connected to Twitch',
        eventSub: 'Connected',
        channel: 'testchannel',
        message: '',
        lastMessageAt: null,
      },
    };

    const result = await director(state);
    console.log('GROQ RESULT:', result);

    expect(result.source).toBe('ai');
    expect(result.reason).toContain('Groq');
    expect(result.recipe).toBeDefined();
    expect(result.recipe.ingredientIds).toEqual(['storm', 'fire']);
    expect(result.recipe.effectIds).toEqual(['lightning_strikes', 'burning_zones']);
    expect(result.recipe.intensity).toBe('medium');
    expect(result.recipe.durationSeconds).toBe(defaultSettings.encounterSeconds);
    expect(typeof result.recipe.title).toBe('string');
    expect(result.recipe.title.length).toBeGreaterThanOrEqual(2);
    expect(result.recipe.title.length).toBeLessThanOrEqual(32);
  }, 15000);
});

