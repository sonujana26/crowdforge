import { balance, type EffectId, type Settings } from '@crowdforge/shared';
export interface Point {
  x: number;
  y: number;
}
export function move(
  player: Point,
  velocity: Point,
  input: Point,
  dt: number,
  effects: EffectId[],
  intensity: Settings['intensity'],
) {
  const norm = Math.hypot(input.x, input.y) || 1;
  const blend = 1 - Math.exp(-(effects.includes('slippery_floor') ? 3 : 20) * dt);
  const next = {
    x: velocity.x + ((input.x / norm) * 230 - velocity.x) * blend,
    y: velocity.y + ((input.y / norm) * 230 - velocity.y) * blend,
  };
  if (effects.includes('gravity_well')) {
    const dx = 480 - player.x,
      dy = 270 - player.y,
      d = Math.hypot(dx, dy);
    if (d > 5 && d < 210) {
      next.x += (dx / d) * balance[intensity].pull;
      next.y += (dy / d) * balance[intensity].pull;
    }
  }
  return {
    position: {
      x: Math.max(18, Math.min(942, player.x + next.x * dt)),
      y: Math.max(18, Math.min(522, player.y + next.y * dt)),
    },
    velocity: {
      x: velocity.x + ((input.x / norm) * 230 - velocity.x) * blend,
      y: velocity.y + ((input.y / norm) * 230 - velocity.y) * blend,
    },
  };
}
export function hazardActive(age: number, kind: 'lightning' | 'fire') {
  return age >= 1000 && age < (kind === 'lightning' ? 1400 : 4000);
}
export function targetForEnemy(enemy: Point, player: Point, decoys: Point[]) {
  return [player, ...decoys].reduce(
    (best, p) =>
      Math.hypot(p.x - enemy.x, p.y - enemy.y) < Math.hypot(best.x - enemy.x, best.y - enemy.y)
        ? p
        : best,
    player,
  );
}
export function spawnPoint(index: number, player: Point): Point {
  const candidates = [
    { x: 24, y: 60 + ((index * 83) % 420) },
    { x: 936, y: 60 + ((index * 83) % 420) },
    { x: 80 + ((index * 97) % 800), y: 24 },
    { x: 80 + ((index * 97) % 800), y: 516 },
  ];
  return candidates.reduce(
    (best, p) =>
      Math.hypot(p.x - player.x, p.y - player.y) > Math.hypot(best.x - player.x, best.y - player.y)
        ? p
        : best,
    candidates[0]!,
  );
}
