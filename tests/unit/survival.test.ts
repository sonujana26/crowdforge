import { describe, it, expect } from 'vitest';
import { Simulation, type Input } from '../../apps/web/src/game/simulation';
import { constrain, distance, safeSpawn, obstacles, WORLD } from '../../apps/web/src/game/world';
import { enemyCatalog } from '../../apps/web/src/game/enemies';
import { fallback } from '../../apps/server/src/game/fallback';
import { defaultSettings, type IngredientId } from '../../apps/shared/src/contracts';
import { combinationFor } from '../../apps/shared/src/contracts';
const idle: Input = { x: 0, y: 0, aim: { x: 1000, y: 520 }, attack: false, dash: false };
function run(s: Simulation, seconds: number, input = idle, active = false) {
  for (let t = 0; t < seconds; t += 1 / 60) s.step(1 / 60, input, active);
}
describe('survival combat', () => {
  it('normalizes diagonals, accelerates smoothly and decelerates', () => {
    const a = new Simulation(),
      b = new Simulation();
    run(a, 0.2, { ...idle, x: 1 });
    run(b, 0.2, { ...idle, x: 1, y: 1 });
    expect(Math.hypot(a.player.vx, a.player.vy)).toBeCloseTo(Math.hypot(b.player.vx, b.player.vy));
    expect(a.player.vx).toBeLessThan(260);
    run(a, 1);
    expect(a.player.vx).toBeLessThan(1);
  });
  it('resolves obstacles and bounds, and spawns away from the player', () => {
    const body = { ...obstacles[0]!, radius: 18 };
    constrain(body);
    expect(distance(body, obstacles[0]!)).toBeGreaterThanOrEqual(52);
    body.x = -100;
    body.y = 2000;
    constrain(body);
    expect(body.x).toBe(113);
    expect(body.y).toBe(787);
    for (let n = 0; n < 50; n++) expect(distance(safeSpawn(body, n), body)).toBeGreaterThan(360);
  });
  it('dash cooldown and invulnerability reject repeated damage', () => {
    const s = new Simulation();
    s.step(0.02, { ...idle, x: 1, dash: true });
    s.hurt(30);
    expect(s.hp).toBe(100);
    const next = s.nextDash;
    s.step(0.02, { ...idle, dash: true });
    expect(s.nextDash).toBe(next);
    run(s, 0.3);
    s.hurt(20);
    s.hurt(20);
    expect(s.hp).toBe(80);
  });
  it('aimed projectiles kill enemies and award score; reset redeploys', () => {
    const s = new Simulation();
    s.spawn('chaser', false, { x: 950, y: 520 });
    run(s, 1, { ...idle, attack: true });
    expect(s.enemies).toHaveLength(0);
    expect(s.score).toBe(100);
    s.hp = 0;
    s.reset(null);
    expect(s.hp).toBe(100);
    expect(s.score).toBe(0);
    expect(s.shots.some((p) => p.active)).toBe(false);
  });
  it('has five different archetypes and bounded waves/projectile pools', () => {
    const s = new Simulation();
    expect(Object.keys(enemyCatalog)).toHaveLength(5);
    s.invulnerableUntil = 100;
    run(s, 30, idle, true);
    expect(s.wave).toBeGreaterThan(3);
    expect(s.enemies.length).toBeLessThanOrEqual(WORLD.maxEnemies);
    expect(s.enemies.some((e) => e.kind === 'elite')).toBe(true);
    expect(s.shots).toHaveLength(WORLD.maxShots);
  });
});
describe('combinations and Warden', () => {
  it('only activates registered combinations and conducts across ice', () => {
    expect(combinationFor(['ice', 'fire'])).toBeUndefined();
    const s = forged(['ice', 'storm']);
    s.time = 2;
    s.modifiers.tick(0.01);
    expect(
      s.modifiers.zones.filter((z) => z.kind === 'lightning' && z.radius === 125),
    ).toHaveLength(3);
  });
  it('pulls fire toward wells and adds reflected echo formations', () => {
    const s = forged(['gravity', 'fire']);
    s.time = 2;
    s.modifiers.tick(0.01);
    const fire = s.modifiers.zones.find((z) => z.kind === 'fire')!;
    const d = distance(fire, s.modifiers.wells[0]!);
    s.modifiers.tick(0.2);
    expect(distance(fire, s.modifiers.wells[0]!)).toBeLessThan(d);
    const echoes = forged(['mirror', 'clones']);
    echoes.time = 2;
    echoes.modifiers.tick(0.01);
    expect(echoes.enemies.some((e) => e.kind === 'ranged' && e.echo)).toBe(true);
  });
  it('boss spawns safely, telegraphs, exposes its core and changes phases', () => {
    const s = forged(['ice', 'gravity']);
    s.time = 6;
    s.boss.tick(s, 0.01);
    expect(s.boss.active).toBe(true);
    expect(distance(s.boss, s.player)).toBeGreaterThan(300);
    expect(s.boss.attackAt - s.time).toBeGreaterThanOrEqual(1);
    s.time = 7.1;
    const hp = s.boss.hp;
    s.boss.hit(25, s);
    expect(hp - s.boss.hp).toBe(7);
    s.time = s.boss.attackAt;
    s.boss.tick(s, 0.01);
    expect(s.boss.vulnerableUntil - s.time).toBeCloseTo(2.7);
    const exposed = s.boss.hp;
    s.boss.hit(25, s);
    expect(exposed - s.boss.hp).toBe(25);
    s.boss.hp = 100;
    s.boss.tick(s, 0.01);
    expect(s.boss.phase).toBe(2);
    s.boss.hit(1000, s);
    expect(s.boss.defeated).toBe(true);
    expect(s.score).toBe(5000);
    s.reset(null);
    expect(s.boss.active).toBe(false);
    expect(s.boss.defeated).toBe(false);
  });
});
function forged(ids: IngredientId[]) {
  const s = new Simulation();
  s.reset(fallback(ids, defaultSettings));
  return s;
}
describe('survival ingredients', () => {
  it('ice reduces drag only within frozen sections and freezes hit enemies', () => {
    const s = forged(['ice']);
    expect(s.modifiers.drag({ x: 800, y: 450 })).toBe(2.4);
    expect(s.modifiers.drag({ x: 180, y: 180 })).toBe(14);
    s.spawn('tank');
    s.modifiers.hit(s.enemies[0]!);
    expect(s.enemies[0]!.frozenUntil).toBeGreaterThan(s.time);
  });
  it('gravity pulls enemies and bends projectiles without trapping the player', () => {
    const s = forged(['gravity']);
    s.player.x = 740;
    s.player.y = 450;
    s.spawn('tank', false, { x: 750, y: 450 });
    s.shoot({ x: 720, y: 420 }, { x: 720, y: 700 }, true);
    const x = s.player.x;
    s.modifiers.tick(0.05);
    expect(s.player.x).toBeLessThan(x);
    expect(s.shots[0]!.vx).toBeLessThan(0);
    run(s, 1, { ...idle, x: 1 });
    expect(s.player.x).toBeGreaterThan(x);
  });
  it('storm telegraphs before damaging and chains damage to nearby enemies', () => {
    const s = forged(['storm']);
    s.modifiers.addZone('lightning', s.player, 65, 1.3);
    s.time = 0.99;
    s.modifiers.tick(0.01);
    expect(s.hp).toBe(100);
    s.time = 1;
    s.modifiers.tick(0.01);
    expect(s.hp).toBe(83);
    s.spawn('tank', false, { x: 800, y: 450 });
    s.spawn('tank', false, { x: 840, y: 450 });
    s.modifiers.hit(s.enemies[0]!);
    expect(s.enemies[1]!.hp).toBe(146);
  });
  it('mirror reflects hostile shots and diverts enemies to decoys', () => {
    const s = forged(['mirror']);
    s.shoot({ x: 515, y: 450 }, { x: 700, y: 450 }, false);
    const shot = s.shots[0]!;
    s.modifiers.reflect(shot);
    expect(shot.friendly).toBe(true);
    expect(shot.vx).toBeLessThan(0);
    s.spawn('chaser', false, { x: 620, y: 620 });
    expect(s.modifiers.target(s.enemies[0]!)).toEqual(s.modifiers.decoys[0]);
  });
  it('clones spawn weaker echoes within the enemy cap and fire burns over time', () => {
    const s = forged(['clones', 'fire']);
    s.time = 2;
    s.modifiers.tick(0.1);
    expect(s.enemies.filter((e) => e.echo)).toHaveLength(3);
    s.spawn('tank');
    const tank = s.enemies.at(-1)!;
    s.modifiers.hit(tank);
    s.modifiers.tick(0.5);
    expect(tank.hp).toBeLessThan(160);
    s.reset(null);
    expect(s.modifiers.zones).toHaveLength(0);
    expect(s.modifiers.effects).toHaveLength(0);
  });
});
