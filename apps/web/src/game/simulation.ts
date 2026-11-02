import type { EventRecipe } from '@crowdforge/shared';
import { Modifiers } from './modifiers';
import { Boss } from './boss';
import { enemyCatalog, waveComposition, type Enemy, type EnemyKind } from './enemies';
import { constrain, direction, distance, safeSpawn, WORLD, obstacles, type Point } from './world';
export interface Input {
  x: number;
  y: number;
  aim: Point;
  attack: boolean;
  dash: boolean;
}
export interface Shot extends Point {
  active: boolean;
  vx: number;
  vy: number;
  life: number;
  friendly: boolean;
  damage: number;
  reflected: boolean;
}
export interface Spark extends Point {
  active: boolean;
  vx: number;
  vy: number;
  life: number;
  color: number;
}
export interface CombatEvent {
  kind:
    | 'attack'
    | 'hit'
    | 'death'
    | 'dash'
    | 'wave'
    | 'reveal'
    | 'boss'
    | 'victory'
    | 'defeat'
    | 'effect';
}
export class Simulation {
  modifiers = new Modifiers(this);
  boss = new Boss();
  time = 0;
  hp = 100;
  score = 0;
  kills = 0;
  wave = 1;
  nextSpawn = 0;
  lastShot = -1;
  nextDash = 0;
  dashUntil = 0;
  invulnerableUntil = 0;
  player = { x: 800, y: 520, radius: 18, vx: 0, vy: 0, angle: 0 };
  enemies: Enemy[] = [];
  shots: Shot[] = Array.from({ length: WORLD.maxShots }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    friendly: false,
    damage: 0,
    reflected: false,
  }));
  sparks: Spark[] = Array.from({ length: 100 }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    color: 0,
  }));
  events: CombatEvent[] = [];
  recipe: EventRecipe | null = null;
  private serial = 0;
  reset(recipe: EventRecipe | null, health = 100) {
    this.time = 0;
    this.hp = health;
    this.score = 0;
    this.kills = 0;
    this.wave = 1;
    this.nextSpawn = 0;
    this.lastShot = -1;
    this.nextDash = 0;
    this.dashUntil = 0;
    this.invulnerableUntil = 0;
    Object.assign(this.player, { x: 800, y: 520, vx: 0, vy: 0, angle: 0 });
    this.enemies = [];
    this.shots.forEach((s) => (s.active = false));
    this.sparks.forEach((s) => (s.active = false));
    this.events = [];
    this.recipe = recipe;
    this.serial = 0;
    this.modifiers.reset(recipe);
    this.boss.reset();
  }
  spawn(kind: EnemyKind, echo = false, point?: Point) {
    if (this.enemies.length >= WORLD.maxEnemies) return;
    const c = enemyCatalog[kind],
      p = point ?? safeSpawn(this.player, this.serial);
    const enemy: Enemy = {
      id: ++this.serial,
      kind,
      ...p,
      radius: c.radius,
      hp: c.hp * (echo ? 0.6 : 1),
      maxHp: c.hp * (echo ? 0.6 : 1),
      attackAt: this.time + 1.1,
      born: this.time,
      hitUntil: 0,
      frozenUntil: 0,
      burnUntil: 0,
      echo,
    };
    constrain(enemy);
    this.enemies.push(enemy);
  }
  shoot(from: Point, target: Point, friendly: boolean, damage = 25, speed = 700) {
    const shot = this.shots.find((s) => !s.active);
    if (!shot) return;
    const n = direction(target.x - from.x, target.y - from.y);
    Object.assign(shot, {
      active: true,
      x: from.x + n.x * 25,
      y: from.y + n.y * 25,
      vx: n.x * speed,
      vy: n.y * speed,
      life: 2.5,
      friendly,
      damage,
      reflected: false,
    });
  }
  burst(p: Point, color: number, count = 10) {
    let n = 0;
    for (const s of this.sparks) {
      if (s.active) continue;
      const a = n * 2.399;
      Object.assign(s, {
        ...p,
        active: true,
        vx: Math.cos(a) * 110,
        vy: Math.sin(a) * 110,
        life: 0.3 + n * 0.012,
        color,
      });
      if (++n >= count) break;
    }
  }
  hurt(amount: number) {
    if (this.time < this.invulnerableUntil || this.hp <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnerableUntil = this.time + 0.8;
    this.events.push({ kind: this.hp ? 'hit' : 'defeat' });
    this.burst(this.player, 0xff634c);
  }
  hitEnemy(e: Enemy, damage: number) {
    if (e.hp <= 0) return;
    e.hp -= damage;
    e.hitUntil = this.time + 0.12;
    if (e.hp <= 0) {
      this.score += enemyCatalog[e.kind].score;
      this.kills++;
      this.burst(e, e.echo ? 0x31ffb0 : 0xff964a);
      this.events.push({ kind: 'death' });
    }
  }
  step(dt: number, input: Input, active = true) {
    const elapsed = Math.min(Math.max(dt, 0), 0.05);
    const steps = Math.max(1, Math.ceil(elapsed / (1 / 120)));
    for (let i = 0; i < steps; i++) this.tick(elapsed / steps, input, active);
  }
  private tick(dt: number, input: Input, active: boolean) {
    this.time += dt;
    for (const s of this.sparks)
      if (s.active) {
        s.life -= dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.life <= 0) s.active = false;
      }
    if (this.hp <= 0) return;
    const p = this.player,
      n = direction(input.x, input.y);
    p.angle = Math.atan2(input.aim.y - p.y, input.aim.x - p.x) + Math.PI / 2;
    if (input.dash && this.time >= this.nextDash) {
      const dash = n.x || n.y ? n : direction(input.aim.x - p.x, input.aim.y - p.y);
      p.vx = dash.x * 780;
      p.vy = dash.y * 780;
      this.dashUntil = this.time + 0.18;
      this.invulnerableUntil = this.time + 0.25;
      this.nextDash = this.time + 2.4;
      this.events.push({ kind: 'dash' });
      this.burst(p, 0x35deff);
    }
    if (this.time >= this.dashUntil) {
      const blend = 1 - Math.exp(-this.modifiers.drag(p) * dt);
      p.vx += (n.x * 260 - p.vx) * blend;
      p.vy += (n.y * 260 - p.vy) * blend;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    constrain(p);
    if (input.attack && this.time - this.lastShot >= 0.16) {
      this.lastShot = this.time;
      this.shoot(p, input.aim, true);
      this.events.push({ kind: 'attack' });
    }
    if (active) {
      this.modifiers.tick(dt);
      this.boss.tick(this, dt);
      const wave = 1 + Math.floor(this.time / 7);
      if (wave !== this.wave) {
        this.wave = wave;
        this.events.push({ kind: 'wave' });
      }
      if (this.time >= this.nextSpawn) {
        for (const kind of waveComposition(this.wave)) this.spawn(kind);
        this.nextSpawn =
          this.time +
          Math.max(1.8, 4.5 - this.wave * 0.4) / (this.modifiers.combination?.difficulty ?? 1);
      }
      for (const e of this.enemies) {
        const target = this.modifiers.target(e);
        const c = enemyCatalog[e.kind],
          d = distance(p, e),
          v = direction(target.x - e.x, target.y - e.y);
        if (this.time < e.born + 0.7) continue;
        const retreat = c.range && d < c.range * 0.7 ? -1 : c.range && d < c.range ? 0 : 1;
        const speed = e.frozenUntil > this.time ? 0 : c.speed * (1 + Math.min(this.wave, 5) * 0.05);
        e.x += v.x * speed * retreat * dt;
        e.y += v.y * speed * retreat * dt;
        constrain(e);
        if (c.range && d < 600 && this.time >= e.attackAt) {
          this.shoot(e, p, false, c.damage, 250);
          if (e.kind === 'elite')
            for (const offset of [-90, 90])
              this.shoot(e, { x: p.x + offset, y: p.y }, false, 10, 220);
          e.attackAt = this.time + c.cooldown;
        }
        if (d < e.radius + p.radius && this.time >= e.attackAt) {
          this.hurt(c.damage);
          e.attackAt = this.time + c.cooldown;
        }
      }
    }
    for (const s of this.shots) {
      if (!s.active) continue;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      this.modifiers.reflect(s);
      if (
        s.life <= 0 ||
        s.x < 95 ||
        s.x > 1505 ||
        s.y < 95 ||
        s.y > 805 ||
        obstacles.some((o) => distance(s, o) < o.radius)
      ) {
        s.active = false;
        continue;
      }
      if (s.friendly) {
        if (this.boss.active && distance(s, this.boss) < this.boss.radius) {
          this.boss.hit(s.damage, this);
          s.active = false;
        } else
          for (const e of this.enemies)
            if (e.hp > 0 && distance(s, e) < e.radius + 5) {
              this.hitEnemy(e, s.damage);
              this.modifiers.hit(e);
              s.active = false;
              break;
            }
      } else if (distance(s, p) < p.radius + 5) {
        this.hurt(s.damage);
        s.active = false;
      }
    }
    this.enemies = this.enemies.filter((e) => e.hp > 0);
  }
}
