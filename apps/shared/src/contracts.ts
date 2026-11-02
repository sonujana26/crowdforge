import { z } from 'zod';
export { combinations, combinationFor } from './encounters';
export const healthSchema = z
  .object({ status: z.literal('ok'), app: z.literal('CrowdForge') })
  .strict();
export const ingredientIds = ['ice', 'gravity', 'storm', 'mirror', 'clones', 'fire'] as const;
export const ingredientSchema = z.enum(ingredientIds);
export type IngredientId = z.infer<typeof ingredientSchema>;
export const duplicateContributionMessage =
  "You've already contributed this round! Wait for the next round.";
export interface ContributionRejection {
  eventId: string;
  roundId: string;
  source: 'twitch' | 'demo';
  reason: 'already_contributed';
  message: typeof duplicateContributionMessage;
  at: number;
}
export const ingredients = [
  { id: 'ice', name: 'Ice', icon: '❄', color: '#80e9ff', description: 'Freeze the flow' },
  { id: 'gravity', name: 'Gravity', icon: '◎', color: '#b5a0ff', description: 'Bend the arena' },
  { id: 'storm', name: 'Storm', icon: 'ϟ', color: '#f8d77b', description: 'Unleash the charge' },
  {
    id: 'mirror',
    name: 'Mirror',
    icon: '◇',
    color: '#ff9ce0',
    description: 'Turn the rules around',
  },
  { id: 'clones', name: 'Clones', icon: '◈', color: '#7df0bc', description: 'Double the danger' },
  { id: 'fire', name: 'Fire', icon: '♨', color: '#ffac78', description: 'Raise the heat' },
] as const;
export const effectIds = [
  'slippery_floor',
  'gravity_well',
  'lightning_strikes',
  'mirror_decoys',
  'echo_enemies',
  'burning_zones',
] as const;
export type EffectId = (typeof effectIds)[number];
export const effectForIngredient: Record<IngredientId, EffectId> = {
  ice: 'slippery_floor',
  gravity: 'gravity_well',
  storm: 'lightning_strikes',
  mirror: 'mirror_decoys',
  clones: 'echo_enemies',
  fire: 'burning_zones',
};
export const effectCatalog: Record<EffectId, { name: string; description: string }> = {
  slippery_floor: {
    name: 'Slippery floor',
    description: 'Movement retains momentum; plan your turns.',
  },
  gravity_well: {
    name: 'Gravity well',
    description: 'A visible central field gently pulls the player.',
  },
  lightning_strikes: {
    name: 'Lightning strikes',
    description: 'Marked circles flash for one second before striking.',
  },
  mirror_decoys: {
    name: 'Mirror decoys',
    description: 'Hollow cyan decoys distract nearby pursuers.',
  },
  echo_enemies: {
    name: 'Echo enemies',
    description: 'A capped wave of smaller, weaker pursuers joins the encounter.',
  },
  burning_zones: {
    name: 'Burning zones',
    description: 'Orange zones warn for one second, then burn briefly.',
  },
};
export const balance = {
  low: { pull: 30, enemySpeed: 65, hazardRadius: 32, echoCount: 2 },
  medium: { pull: 45, enemySpeed: 75, hazardRadius: 40, echoCount: 3 },
  high: { pull: 60, enemySpeed: 85, hazardRadius: 48, echoCount: 4 },
} as const;

const safeText = (max: number, min = 0) =>
  z
    .string()
    .min(min)
    .max(max)
    // eslint-disable-next-line no-control-regex
    .regex(/^[^<>\u0000-\u001f\u007f]*$/u);
export const recipeObjectSchema = z
  .object({
    recipeId: z.string().uuid(),
    title: safeText(32, 2),
    tagline: safeText(100),
    ingredientIds: z.array(ingredientSchema).min(1).max(2),
    effectIds: z.array(z.enum(effectIds)).min(1).max(2),
    intensity: z.enum(['low', 'medium', 'high']),
    durationSeconds: z.number().int().min(15).max(35),
    narration: safeText(140),
  })
  .strict();
export const recipeSchema = recipeObjectSchema
  .refine(
    (r) =>
      new Set(r.effectIds).size === r.effectIds.length &&
      new Set(r.ingredientIds).size === r.ingredientIds.length,
    'Duplicate ingredients or effects',
  )
  .refine(
    (r) => r.effectIds.every((e) => r.ingredientIds.some((i) => effectForIngredient[i] === e)),
    'Effects must match ingredients',
  );
export type EventRecipe = z.infer<typeof recipeSchema>;
export const settingsSchema = z
  .object({
    contributionSeconds: z.number().int().min(5).max(60),
    encounterSeconds: z.number().int().min(15).max(35),
    autoNext: z.boolean(),
    intensity: z.enum(['low', 'medium', 'high']),
    sound: z.boolean(),
  })
  .strict();
export type Settings = z.infer<typeof settingsSchema>;
export const defaultSettings: Settings = {
  contributionSeconds: 20,
  encounterSeconds: 30,
  autoNext: false,
  intensity: 'medium',
  sound: false,
};
export type RoundPhase =
  'IDLE' | 'CONTRIBUTION' | 'FORGING' | 'REVEAL' | 'ENCOUNTER' | 'RESULT' | 'PAUSED' | 'ERROR';
export interface IngredientCount {
  ingredientId: IngredientId;
  count: number;
  percentage: number;
}
export interface NormalizedChatMessage {
  messageId: string;
  broadcasterId: string;
  userId: string;
  displayName: string;
  text: string;
  receivedAt: number;
  source: 'twitch' | 'demo';
}
export interface GameSummary {
  playerHealthRatio: number;
  enemyCount: number;
  difficulty: Settings['intensity'];
  activeEffectIds: EffectId[];
  recentEffectIds: EffectId[];
}
export interface RoundResult {
  roundId: string;
  survived: boolean | null;
  survivalSeconds: number;
  contributions: number;
  distinctContributors: number;
  counts: IngredientCount[];
  recipe: EventRecipe | null;
  recipeSource: 'ai' | 'fallback' | 'none';
}
export interface TwitchStatus {
  state: 'Disconnected' | 'Authentication required' | 'Reconnecting' | 'Connected to Twitch';
  eventSub: string;
  channel: string | null;
  message: string;
  lastMessageAt: number | null;
}
export interface RoundState {
  roundId: string;
  roundNumber: number;
  phase: RoundPhase;
  phaseStartedAt: number | null;
  phaseEndsAt: number | null;
  remainingMs: number | null;
  counts: IngredientCount[];
  distinctContributors: number;
  topIngredientIds: IngredientId[];
  recipe: EventRecipe | null;
  recipeSource: 'ai' | 'fallback' | 'none';
  recipeReason: string;
  gameSummary: GameSummary;
  lastResult: RoundResult | null;
  demoMode: boolean;
  settings: Settings;
  activity: { text: string; source: 'demo' | 'twitch' | 'system'; at: number }[];
  twitch: TwitchStatus;
  aiConfigured: boolean;
  serverNow: number;
}
export const demoSchema = z
  .object({ viewer: z.number().int().min(1).max(100), text: z.string().min(1).max(160) })
  .strict();
export const telemetrySchema = z
  .object({
    roundId: z.string().uuid(),
    health: z.number().min(0).max(1),
    enemies: z.number().int().min(0).max(40),
  })
  .strict();
