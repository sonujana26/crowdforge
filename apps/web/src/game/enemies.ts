export const enemyCatalog = {
  chaser: { hp: 45, speed: 105, damage: 12, radius: 20, score: 100, range: 0, cooldown: 1.2 },
  ranged: { hp: 35, speed: 75, damage: 10, radius: 18, score: 140, range: 340, cooldown: 2.1 },
  tank: { hp: 160, speed: 48, damage: 22, radius: 28, score: 260, range: 0, cooldown: 1.8 },
  swarm: { hp: 18, speed: 148, damage: 6, radius: 12, score: 60, range: 0, cooldown: 0.9 },
  elite: { hp: 100, speed: 95, damage: 15, radius: 24, score: 320, range: 280, cooldown: 1.8 },
} as const;
export type EnemyKind = keyof typeof enemyCatalog;
export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  attackAt: number;
  born: number;
  hitUntil: number;
  frozenUntil: number;
  burnUntil: number;
  echo: boolean;
}
export function waveComposition(wave: number): EnemyKind[] {
  if (wave === 1) return ['chaser', 'chaser', 'ranged'];
  if (wave === 2) return ['tank', 'ranged', 'swarm', 'swarm', 'swarm'];
  return ['elite', 'tank', 'ranged', 'swarm', 'swarm', 'chaser'];
}
