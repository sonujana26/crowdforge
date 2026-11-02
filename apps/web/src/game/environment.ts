import Phaser from 'phaser';
import { obstacles } from './world';
export const assetNames = [
  'floor',
  'crate',
  'wall',
  'pillar',
  'reactor',
  'player',
  'chaser',
  'ranged',
  'tank',
  'swarm',
  'elite',
  'boss',
] as const;
export function loadEnvironment(scene: Phaser.Scene) {
  for (const name of assetNames) scene.load.image(name, `/assets/forge/${name}.png`);
}
export function renderEnvironment(scene: Phaser.Scene) {
  const base = scene.add.graphics().setDepth(-10);
  base.fillStyle(0x030a12);
  base.fillRect(0, 0, 1600, 900);
  for (let x = 110; x < 1500; x += 128)
    for (let y = 110; y < 800; y += 118)
      scene.add.image(x, y, 'floor').setDisplaySize(202, 202).setDepth(-9).setTint(0x91a9bf);
  scene.add.image(800, 450, 'reactor').setDisplaySize(500, 500).setDepth(-8);
  for (let x = 105; x < 1510; x += 125)
    for (const y of [62, 842])
      scene.add
        .image(x, y, 'wall')
        .setDisplaySize(200, 200)
        .setDepth(y === 62 ? -2 : 1000);
  for (const x of [55, 1545])
    for (let y = 175; y < 800; y += 120)
      scene.add
        .image(x, y, 'wall')
        .setDisplaySize(190, 190)
        .setAngle(x === 55 ? 90 : -90)
        .setDepth(1000);
  for (const x of [105, 1495])
    for (const y of [110, 790])
      scene.add.image(x, y, 'pillar').setDisplaySize(170, 170).setDepth(y);
  for (const o of obstacles) {
    scene.add.ellipse(o.x + 8, o.y + 15, 85, 50, 0x000000, 0.5).setDepth(-3);
    scene.add
      .image(o.x, o.y - 10, 'crate')
      .setDisplaySize(150, 150)
      .setDepth(o.y);
  }
  const detail = scene.add.graphics().setDepth(-5);
  detail.lineStyle(2, 0x78b8d9, 0.2);
  detail.strokeRect(330, 130, 940, 640);
  for (const x of [400, 1200])
    for (const y of [210, 690]) {
      detail.fillStyle(0xff8a32, 0.12);
      detail.fillCircle(x, y, 75);
      detail.fillStyle(0xffa34c, 0.7);
      detail.fillRect(x - 25, y, 50, 3);
    }
}
