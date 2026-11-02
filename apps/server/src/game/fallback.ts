import { randomUUID } from 'node:crypto';
import {
  recipeSchema,
  combinationFor,
  effectForIngredient,
  type IngredientId,
  type Settings,
} from '@crowdforge/shared';
export function fallback(top: IngredientId[], settings: Settings) {
  const selected: IngredientId[] = top.length ? [...new Set(top)].slice(0, 2) : ['ice'];
  const pair = [...selected].sort().join('+');
  const combinations: Record<string, string> = {
    'gravity+ice': 'ORBITAL BLIZZARD',
    'mirror+storm': 'REFRACTION STORM',
    'clones+fire': 'AFTERIMAGE INFERNO',
  };
  const names: Record<IngredientId, string> = {
    ice: 'FROST CIRCUIT',
    gravity: 'ORBITAL DRIFT',
    storm: 'STATIC FRONT',
    mirror: 'PHANTOM CIRCUIT',
    clones: 'ECHO PROTOCOL',
    fire: 'EMBER FIELD',
  };
  const title = top.length
    ? (combinationFor(selected)?.title ??
      combinations[pair] ??
      (selected.length === 1
        ? names[selected[0]!]
        : `${selected[0]} × ${selected[1]}`.toUpperCase()))
    : 'ARENA CALIBRATION';
  return recipeSchema.parse({
    recipeId: randomUUID(),
    title,
    tagline: top.length
      ? `The crowd forged ${selected.join(' + ')}. Read the arena and survive.`
      : 'No ingredients received: default encounter',
    ingredientIds: selected,
    effectIds: selected.map((i) => effectForIngredient[i]),
    intensity: settings.intensity,
    durationSeconds: settings.encounterSeconds,
    narration: 'Survive the arena. Aim and fire. Space dashes through danger.',
  });
}
