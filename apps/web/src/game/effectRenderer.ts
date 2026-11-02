import Phaser from 'phaser';
import type { Simulation } from './simulation';
export function drawEffects(g: Phaser.GameObjects.Graphics, sim: Simulation) {
  g.clear();
  const m = sim.modifiers,
    t = sim.time;
  for (const z of m.zones) {
    const age = t - z.born,
      warning = age < 1;
    const color = z.kind === 'ice' ? 0x65dfff : z.kind === 'fire' ? 0xff6b22 : 0xa1dfff;
    g.fillStyle(color, z.kind === 'ice' ? 0.13 : warning ? 0.06 : 0.32);
    g.fillCircle(z.x, z.y, z.radius);
    g.lineStyle(warning ? 2 : 3, color, warning ? 0.5 + Math.sin(t * 15) * 0.3 : 0.8);
    g.strokeCircle(z.x, z.y, z.radius);
    if (warning) {
      g.lineStyle(1, color, 0.4);
      g.lineBetween(z.x - 12, z.y, z.x + 12, z.y);
      g.lineBetween(z.x, z.y - 12, z.x, z.y + 12);
    } else if (z.kind === 'lightning') {
      g.lineStyle(4, 0xe4ffff, 1);
      g.beginPath();
      g.moveTo(z.x - 10, z.y - 100);
      g.lineTo(z.x + 10, z.y - 60);
      g.lineTo(z.x - 10, z.y - 40);
      g.lineTo(z.x, z.y);
      g.strokePath();
    } else if (z.kind === 'ice') {
      for (let n = 0; n < 6; n++) {
        const a = (n * Math.PI) / 3;
        g.lineStyle(1, color, 0.35);
        g.lineBetween(z.x, z.y, z.x + Math.cos(a) * z.radius, z.y + Math.sin(a) * z.radius);
        g.fillStyle(0x9cecff, 0.5);
        g.fillTriangle(
          z.x + Math.cos(a) * z.radius,
          z.y + Math.sin(a) * z.radius - 22,
          z.x + Math.cos(a) * z.radius - 8,
          z.y + Math.sin(a) * z.radius + 5,
          z.x + Math.cos(a) * z.radius + 8,
          z.y + Math.sin(a) * z.radius + 5,
        );
      }
    } else
      for (let n = 0; n < 7; n++) {
        const a = n * 2.4;
        const x = z.x + Math.cos(a) * z.radius * 0.6,
          y = z.y + Math.sin(a) * z.radius * 0.6;
        g.fillStyle(n % 2 ? 0xffa329 : 0xff5424, 0.65);
        g.fillTriangle(
          x - 9,
          y + 7,
          x + 9,
          y + 7,
          x + Math.sin(t * 8 + n) * 6,
          y - 15 - Math.sin(t * 11 + n) * 9,
        );
      }
  }
  for (const w of m.wells) {
    g.fillStyle(0x8d46e8, 0.12);
    g.fillCircle(w.x, w.y, w.radius);
    for (let n = 0; n < 5; n++) {
      const r = (t * 35 + n * 36) % w.radius;
      g.lineStyle(2, 0xb18cff, 1 - r / w.radius);
      g.strokeEllipse(w.x, w.y, r * 2, r * 1.4);
      const a = t + n * 1.7;
      g.fillStyle(0xcbb7ff, 0.7);
      g.fillCircle(w.x + Math.cos(a) * r, w.y + Math.sin(a) * r * 0.7, 2);
    }
  }
  for (const b of m.barriers) {
    g.fillStyle(0xdd8dff, 0.1);
    g.fillRect(b.x - 8, b.y - b.radius, 16, b.radius * 2);
    g.lineStyle(3, 0xe2a4ff, 0.8);
    g.lineBetween(b.x, b.y - b.radius, b.x, b.y + b.radius);
    for (let n = -3; n <= 3; n++) g.lineBetween(b.x - 7, b.y + n * 25, b.x + 7, b.y + n * 25 - 12);
  }
  for (const d of m.decoys) {
    g.lineStyle(2, 0xb7dfff, 0.5);
    g.strokeRect(d.x - 12, d.y - 23, 24, 34);
    g.strokeCircle(d.x, d.y - 32, 9);
    g.lineBetween(d.x - 7, d.y + 11, d.x - 10, d.y + 24);
    g.lineBetween(d.x + 7, d.y + 11, d.x + 10, d.y + 24);
  }
  for (const a of m.arcs) {
    g.lineStyle(3, 0xc3efff, 1);
    g.beginPath();
    g.moveTo(a.from.x, a.from.y);
    g.lineTo((a.from.x + a.to.x) / 2 + 10, (a.from.y + a.to.y) / 2 - 10);
    g.lineTo(a.to.x, a.to.y);
    g.strokePath();
  }
}
