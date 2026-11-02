import type { EffectId, EventRecipe } from '@crowdforge/shared';
import { combinationFor } from '@crowdforge/shared';
import type { Simulation, Shot } from './simulation';
import type { Enemy } from './enemies';
import { direction, distance, type Point } from './world';
export interface Zone extends Point {
  radius: number;
  born: number;
  duration: number;
  kind: 'ice' | 'fire' | 'lightning';
}
export interface Field extends Point {
  radius: number;
}
interface Modifier {
  start?: (m: Modifiers) => void;
  tick?: (m: Modifiers, dt: number) => void;
  hit?: (m: Modifiers, e: Enemy) => void;
}
const registry: Record<EffectId, Modifier> = {
  slippery_floor: {
    start: (m) => {
      m.zones.push(
        ...[
          { x: 520, y: 340 },
          { x: 1080, y: 560 },
          { x: 800, y: 450 },
        ].map((p) => ({ ...p, radius: 125, born: -2, duration: 99, kind: 'ice' as const })),
      );
    },
    hit: (m, e) => {
      e.frozenUntil = m.sim.time + 0.65;
    },
    tick: (m) => {
      for (const e of m.sim.enemies)
        if (
          m.zones.some((z) => z.kind === 'ice' && distance(z, e) < z.radius) &&
          m.sim.time % 4 < 0.35
        )
          e.frozenUntil = m.sim.time + 0.3;
    },
  },
  gravity_well: {
    start: (m) => {
      m.wells = [
        { x: 650, y: 450, radius: 185 },
        { x: 1050, y: 370, radius: 155 },
      ];
    },
    tick: (m, dt) => {
      for (const w of m.wells) {
        for (const body of [m.sim.player, ...m.sim.enemies]) {
          const d = distance(body, w);
          if (d < w.radius && d > 28) {
            const n = direction(w.x - body.x, w.y - body.y);
            body.x += n.x * m.pull * dt;
            body.y += n.y * m.pull * dt;
          }
        }
        for (const s of m.sim.shots)
          if (s.active && distance(s, w) < w.radius) {
            const n = direction(w.x - s.x, w.y - s.y);
            s.vx += n.x * 180 * dt;
            s.vy += n.y * 180 * dt;
          }
        for (const s of m.sim.sparks)
          if (s.active && distance(s, w) < w.radius) {
            const n = direction(w.x - s.x, w.y - s.y);
            s.vx += n.x * 250 * dt;
            s.vy += n.y * 250 * dt;
          }
      }
    },
  },
  lightning_strikes: {
    tick: (m) => {
      if (m.due('storm', 2.6)) {
        const p = m.sim.player;
        m.addZone('lightning', { x: p.x, y: p.y }, 65, 1.3);
        m.sim.events.push({ kind: 'effect' });
      }
    },
    hit: (m, e) => {
      if (m.sim.time < m.nextChain) return;
      m.nextChain = m.sim.time + 0.5;
      let count = 0;
      for (const other of m.sim.enemies)
        if (other !== e && distance(e, other) < 160 && count++ < 3) {
          m.sim.hitEnemy(other, 14);
          m.arcs.push({
            from: { x: e.x, y: e.y },
            to: { x: other.x, y: other.y },
            until: m.sim.time + 0.15,
          });
        }
    },
  },
  mirror_decoys: {
    start: (m) => {
      m.barriers = [
        { x: 540, y: 450, radius: 95 },
        { x: 1060, y: 450, radius: 95 },
      ];
      m.decoys = [
        { x: 620, y: 630, radius: 18 },
        { x: 980, y: 270, radius: 18 },
      ];
    },
    tick: (m) => {
      if (m.due('mirror', 6)) {
        m.decoys.forEach((d, i) => {
          d.x = 1600 - m.sim.player.x + (i ? 65 : -65);
          d.y = 900 - m.sim.player.y;
        });
      }
    },
  },
  echo_enemies: {
    tick: (m) => {
      if (m.due('echo', 6)) {
        for (let n = 0; n < 3; n++) m.sim.spawn('swarm', true);
      }
    },
  },
  burning_zones: {
    tick: (m) => {
      if (m.due('fire', 3.8)) {
        const index = m.sequence++;
        const points = [
          { x: 440, y: 300 },
          { x: 1160, y: 600 },
          { x: 440, y: 600 },
          { x: 1160, y: 300 },
        ];
        m.addZone('fire', points[index % 4]!, 55, 5.5);
        if (index > 0)
          m.addZone('fire', { x: points[index % 4]!.x + 85, y: points[index % 4]!.y }, 40, 4.5);
      }
    },
    hit: (m, e) => {
      e.burnUntil = m.sim.time + 2.5;
    },
  },
};
export class Modifiers {
  combination: ReturnType<typeof combinationFor>;
  zones: Zone[] = [];
  wells: Field[] = [];
  barriers: Field[] = [];
  decoys: Field[] = [];
  arcs: { from: Point; to: Point; until: number }[] = [];
  nextChain = 0;
  sequence = 0;
  pull = 45;
  effects: EffectId[] = [];
  private deadlines = new Map<string, number>();
  constructor(public sim: Simulation) {}
  reset(recipe: EventRecipe | null) {
    this.zones = [];
    this.wells = [];
    this.barriers = [];
    this.decoys = [];
    this.arcs = [];
    this.deadlines.clear();
    this.nextChain = 0;
    this.sequence = 0;
    this.effects = recipe?.effectIds ?? [];
    this.combination = combinationFor(recipe?.ingredientIds ?? []);
    this.pull = recipe?.intensity === 'high' ? 65 : recipe?.intensity === 'low' ? 30 : 45;
    for (const id of this.effects) registry[id].start?.(this);
    if (this.combination?.id === 'orbital_blizzard')
      for (const w of this.wells) this.zones.push({ ...w, born: -2, duration: 99, kind: 'ice' });
  }
  due(key: string, interval: number) {
    if (this.sim.time < (this.deadlines.get(key) ?? 1)) return false;
    this.deadlines.set(key, this.sim.time + interval);
    return true;
  }
  addZone(kind: Zone['kind'], p: Point, radius: number, duration: number) {
    if (this.zones.length < 18)
      this.zones.push({ ...p, radius, born: this.sim.time, duration, kind });
  }
  drag(p: Point) {
    return this.zones.some((z) => z.kind === 'ice' && distance(p, z) < z.radius) ? 2.4 : 14;
  }
  target(e: Enemy) {
    return this.decoys.reduce<Point>(
      (best, p) => (distance(e, p) < distance(e, best) ? p : best),
      this.sim.player,
    );
  }
  hit(e: Enemy) {
    for (const id of this.effects) registry[id].hit?.(this, e);
  }
  reflect(s: Shot) {
    if (s.reflected) return;
    for (const b of this.barriers)
      if (Math.abs(s.x - b.x) < 9 && Math.abs(s.y - b.y) < b.radius) {
        s.vx = -s.vx;
        s.friendly = true;
        s.reflected = true;
        s.x += Math.sign(s.vx) * 12;
        this.sim.burst(s, 0xe391ff, 4);
        break;
      }
  }
  tick(dt: number) {
    for (const id of this.effects) registry[id].tick?.(this, dt);
    const combination = this.combination?.id;
    if (combination === 'solar_singularity')
      for (const z of this.zones)
        if (z.kind === 'fire') {
          const w = this.wells[0]!;
          const n = direction(w.x - z.x, w.y - z.y);
          z.x += n.x * 28 * dt;
          z.y += n.y * 28 * dt;
        }
    if (combination === 'frozen_circuit' && this.due('conduct', 4))
      for (const z of this.zones.filter((z) => z.kind === 'ice'))
        this.addZone('lightning', z, z.radius, 1.35);
    if (combination === 'echo_labyrinth' && this.due('formation', 7))
      for (const p of [
        { x: 380, y: 220 },
        { x: 1220, y: 680 },
      ])
        this.sim.spawn('ranged', true, p);
    this.zones = this.zones.filter((z) => this.sim.time - z.born < z.duration);
    this.arcs = this.arcs.filter((a) => a.until > this.sim.time);
    for (const z of this.zones) {
      if (z.kind === 'ice' || this.sim.time - z.born < 1) continue;
      if (distance(z, this.sim.player) < z.radius) this.sim.hurt(z.kind === 'fire' ? 8 : 17);
      for (const e of this.sim.enemies)
        if (distance(z, e) < z.radius) {
          if (z.kind === 'fire') e.burnUntil = this.sim.time + 0.4;
          else if (this.due(`strike-${e.id}`, 1)) this.sim.hitEnemy(e, 20);
        }
    }
    for (const e of this.sim.enemies) if (e.burnUntil > this.sim.time) this.sim.hitEnemy(e, 8 * dt);
  }
}
