import { combinationFor } from '@crowdforge/shared';
import type { Simulation } from './simulation';
import { direction, distance, safeSpawn, constrain, type Point } from './world';
export class Boss {
  x = 800;
  y = 180;
  radius = 52;
  hp = 360;
  maxHp = 360;
  active = false;
  defeated = false;
  born = 0;
  phase = 1;
  pattern = 0;
  attackAt = 0;
  vulnerableUntil = 0;
  chargeUntil = 0;
  hitUntil = 0;
  target: Point = { x: 800, y: 450 };
  private vx = 0;
  private vy = 0;
  reset() {
    this.active = false;
    this.defeated = false;
    this.pattern = 0;
    this.phase = 1;
    this.chargeUntil = 0;
    this.vulnerableUntil = 0;
    this.hitUntil = 0;
  }
  spawn(sim: Simulation) {
    const p = safeSpawn(sim.player, 1);
    this.x = p.x;
    this.y = p.y;
    this.hp = this.maxHp =
      sim.recipe?.intensity === 'low' ? 250 : sim.recipe?.intensity === 'high' ? 460 : 360;
    this.active = true;
    this.born = sim.time;
    this.attackAt = sim.time + 2;
    this.target = { ...sim.player };
    sim.events.push({ kind: 'boss' });
  }
  hit(damage: number, sim: Simulation) {
    if (!this.active || sim.time - this.born < 1) return;
    this.hp = Math.max(0, this.hp - damage * (sim.time < this.vulnerableUntil ? 1 : 0.28));
    this.hitUntil = sim.time + 0.12;
    if (!this.hp) {
      this.active = false;
      this.defeated = true;
      sim.score += 5000;
      sim.burst(this, 0xffa72d, 40);
      sim.events.push({ kind: 'victory' });
    }
  }
  tick(sim: Simulation, dt: number) {
    if (!this.active) {
      if (!this.defeated && sim.time >= 6) this.spawn(sim);
      return;
    }
    this.phase = this.hp / this.maxHp < 0.5 ? 2 : 1;
    const combo = combinationFor(sim.recipe?.ingredientIds ?? []);
    if (sim.time < this.chargeUntil) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      constrain(this);
      if (distance(this, sim.player) < this.radius + sim.player.radius) sim.hurt(24);
      return;
    }
    if (sim.time >= this.attackAt) {
      if (this.pattern % 3 === 1) {
        const n = direction(this.target.x - this.x, this.target.y - this.y);
        const speed = combo?.id === 'solar_singularity' ? 280 : 380;
        this.vx = n.x * speed;
        this.vy = n.y * speed;
        this.chargeUntil = sim.time + 0.8;
      } else if (this.pattern % 3 === 2) {
        for (let n = 0; n < 3; n++)
          sim.modifiers.addZone(
            'lightning',
            { x: this.target.x + (n - 1) * 130, y: this.target.y },
            55,
            1.35,
          );
      } else {
        const count = this.phase === 2 ? 12 : 8;
        for (let n = 0; n < count; n++) {
          const a = (n * Math.PI * 2) / count + this.pattern * 0.23;
          sim.shoot(
            this,
            { x: this.x + Math.cos(a) * 200, y: this.y + Math.sin(a) * 200 },
            false,
            14,
            190,
          );
          if (combo?.id === 'echo_labyrinth')
            sim.shoot(
              { x: 1600 - this.x, y: 900 - this.y },
              { x: 1600 - this.x - Math.cos(a) * 200, y: 900 - this.y - Math.sin(a) * 200 },
              false,
              10,
              160,
            );
        }
      }
      this.vulnerableUntil =
        sim.time + (combo?.id === 'orbital_blizzard' || combo?.id === 'frozen_circuit' ? 2.7 : 2.2);
      this.pattern++;
      this.attackAt = sim.time + (this.phase === 2 ? 3.3 : 4);
      this.target = { x: sim.player.x, y: sim.player.y };
      sim.events.push({ kind: 'effect' });
    }
    if (this.attackAt - sim.time > 1.2) this.target = { x: sim.player.x, y: sim.player.y };
  }
}
