import { describe, expect, it } from 'vitest';
import { hazardActive, move, spawnPoint, targetForEnemy } from '../../apps/web/src/game/mechanics';
describe('implemented mechanics', () => {
  it('ice preserves momentum and stays inside the arena', () => {
    const p = { x: 400, y: 270 },
      v = { x: 200, y: 0 },
      input = { x: 0, y: 0 };
    expect(move(p, v, input, 0.05, ['slippery_floor'], 'medium').velocity.x).toBeGreaterThan(
      move(p, v, input, 0.05, [], 'medium').velocity.x,
    );
    expect(
      move({ x: 942, y: 522 }, v, { x: 1, y: 1 }, 0.05, ['slippery_floor'], 'high').position,
    ).toEqual({ x: 942, y: 522 });
  });
  it('gravity pulls locally but cannot overpower movement', () => {
    const p = { x: 600, y: 270 };
    const idle = move(p, { x: 0, y: 0 }, { x: 0, y: 0 }, 0.05, ['gravity_well'], 'high');
    expect(idle.position.x).toBeLessThan(p.x);
    const escape = move(p, { x: 230, y: 0 }, { x: 1, y: 0 }, 0.05, ['gravity_well'], 'high');
    expect(escape.position.x).toBeGreaterThan(p.x);
  });
  it('lightning and fire always telegraph for 1000ms and expire', () => {
    for (const kind of ['lightning', 'fire'] as const) {
      expect(hazardActive(999, kind)).toBe(false);
      expect(hazardActive(1000, kind)).toBe(true);
      expect(hazardActive(5000, kind)).toBe(false);
    }
    expect(hazardActive(2000, 'lightning')).toBe(false);
    expect(hazardActive(2000, 'fire')).toBe(true);
  });
  it('mirror decoys actually divert pursuers', () => {
    const player = { x: 500, y: 500 },
      decoy = { x: 100, y: 100 };
    expect(targetForEnemy({ x: 110, y: 110 }, player, [decoy])).toBe(decoy);
    expect(targetForEnemy({ x: 490, y: 490 }, player, [decoy])).toBe(player);
  });
  it('spawns at a distant boundary, never on the player', () => {
    for (let i = 0; i < 40; i++) {
      const player = { x: 24, y: 60 };
      const p = spawnPoint(i, player);
      expect(Math.hypot(p.x - player.x, p.y - player.y)).toBeGreaterThan(500);
    }
  });
});
