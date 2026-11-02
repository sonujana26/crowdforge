import type { IngredientId } from './contracts';
export const combinations = [
  {
    id: 'frozen_circuit',
    ingredients: ['ice', 'storm'],
    title: 'FROZEN CIRCUIT',
    description: 'Lightning conducts across frozen floor sections.',
    difficulty: 1.12,
    boss: 'Longer recovery after electrical attacks.',
  },
  {
    id: 'solar_singularity',
    ingredients: ['gravity', 'fire'],
    title: 'SOLAR SINGULARITY',
    description: 'Burning zones drift into gravitational fields.',
    difficulty: 1.1,
    boss: 'Gravity slows the boss charge.',
  },
  {
    id: 'echo_labyrinth',
    ingredients: ['mirror', 'clones'],
    title: 'ECHO LABYRINTH',
    description: 'Reflected echo formations flank the reactor.',
    difficulty: 1.15,
    boss: 'Boss volleys mirror across the arena.',
  },
  {
    id: 'orbital_blizzard',
    ingredients: ['ice', 'gravity'],
    title: 'ORBITAL BLIZZARD',
    description: 'Frozen wells preserve momentum as they pull.',
    difficulty: 1.08,
    boss: 'Frost extends the boss vulnerability window.',
  },
] as const;
export function combinationFor(ids: readonly IngredientId[]) {
  return combinations.find((c) => c.ingredients.every((i) => ids.includes(i)));
}
