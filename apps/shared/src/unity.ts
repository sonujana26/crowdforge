import { z } from 'zod';
import { recipeSchema, telemetrySchema, type RoundState } from './contracts';

export const unityHudSchema = z
  .object({
    health: z.number().min(0).max(1),
    score: z.number().int().min(0).max(10000000),
    wave: z.number().int().min(0).max(100),
    dash: z.number().min(0).max(3),
    muted: z.boolean(),
    bossHealth: z.number().min(0).max(1),
    bossPhase: z.number().int().min(0).max(2),
    bossExposed: z.boolean(),
  })
  .strict();
export type UnityHud = z.infer<typeof unityHudSchema>;

export const unityEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready'), protocol: z.literal(1) }).strict(),
  z.object({ type: z.literal('telemetry'), payload: telemetrySchema }).strict(),
  z.object({ type: z.literal('hud'), payload: unityHudSchema }).strict(),
]);
const buildPath = (extension: string) =>
  z
    .string()
    .regex(new RegExp(`^/unity/Build/[a-zA-Z0-9_-]+\\.${extension.replaceAll('.', '\\.')}$`));
export const unityManifestSchema = z
  .object({
    protocol: z.literal(1),
    loaderUrl: buildPath('loader.js'),
    dataUrl: buildPath('data'),
    frameworkUrl: buildPath('framework.js'),
    codeUrl: buildPath('wasm'),
  })
  .strict();

export function unitySnapshot(
  state: RoundState,
  connected: boolean,
  sequence: number,
  seconds: number,
) {
  const recipe = state.recipe ? recipeSchema.parse(state.recipe) : null;
  return {
    protocol: 1,
    sequence,
    roundId: state.roundId,
    roundNumber: state.roundNumber,
    phase: state.phase,
    encounterActive:
      state.phase === 'ENCOUNTER' ||
      (state.phase === 'PAUSED' && state.gameSummary.activeEffectIds.length > 0),
    connected,
    demoMode: state.demoMode,
    seconds,
    health: state.gameSummary.playerHealthRatio,
    contributors: state.distinctContributors,
    title: recipe?.title ?? 'The next challenge is yours.',
    outcome:
      state.phase === 'RESULT'
        ? state.lastResult?.survived === true
          ? 'victory'
          : state.lastResult?.survived === false
            ? 'defeat'
            : 'unreported'
        : '',
    effects: recipe?.effectIds ?? [],
    intensity: recipe?.intensity ?? 'medium',
    counts: state.counts.map(({ ingredientId, count, percentage }) => ({
      ingredientId,
      count,
      percentage,
    })),
  };
}
export function eligibleTelemetry(
  value: unknown,
  state: RoundState,
  creator: boolean,
  connected: boolean,
) {
  const parsed = unityEventSchema.safeParse(value);
  if (
    !parsed.success ||
    parsed.data.type !== 'telemetry' ||
    !creator ||
    !connected ||
    state.phase !== 'ENCOUNTER' ||
    parsed.data.payload.roundId !== state.roundId
  )
    return null;
  return parsed.data.payload;
}
