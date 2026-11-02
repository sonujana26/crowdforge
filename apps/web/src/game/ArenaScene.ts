import Phaser from 'phaser';
import type { RoundState } from '@crowdforge/shared';
import { api } from '../lib/api';
import { Simulation } from './simulation';
import { loadEnvironment, renderEnvironment } from './environment';
import { drawEffects } from './effectRenderer';
export interface ArenaLive {
  state: RoundState;
  connected: boolean;
  creator: boolean;
  focused: boolean;
  muted: boolean;
  volume: number;
}
export interface ArenaHud {
  health: number;
  score: number;
  wave: number;
  survival: number;
  dash: number;
  enemies: number;
  fps: number;
}
export class ArenaScene extends Phaser.Scene {
  sim = new Simulation();
  private player!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Ellipse;
  private enemies = new Map<number, Phaser.GameObjects.Image>();
  private shotViews: Phaser.GameObjects.Rectangle[] = [];
  private sparkViews: Phaser.GameObjects.Rectangle[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private bars!: Phaser.GameObjects.Graphics;
  private lastRound = '';
  private previousPhase = '';
  private lastHud = 0;
  private lastTelemetry = 0;
  private effects!: Phaser.GameObjects.Graphics;
  private bossView!: Phaser.GameObjects.Image;
  private bossLabel!: Phaser.GameObjects.Text;
  constructor(
    private live: () => ArenaLive,
    private report: (hud: ArenaHud) => void,
  ) {
    super('CrowdForgeArena');
  }
  preload() {
    loadEnvironment(this);
    const text = this.add
      .text(800, 450, 'LOADING REACTOR…', { fontSize: '24px', color: '#39dfff' })
      .setOrigin(0.5);
    this.load.on('progress', (value: number) =>
      text.setText(`LOADING REACTOR ${Math.round(value * 100)}%`),
    );
    this.load.once('complete', () => text.destroy());
  }
  create() {
    renderEnvironment(this);
    this.shadow = this.add.ellipse(800, 520, 42, 22, 0x000000, 0.55);
    this.player = this.add.image(800, 520, 'player').setDisplaySize(96, 96);
    this.bars = this.add.graphics().setDepth(1500);
    this.effects = this.add.graphics().setDepth(1);
    this.bossView = this.add.image(800, 180, 'boss').setDisplaySize(220, 220).setVisible(false);
    this.bossLabel = this.add
      .text(800, 78, '', {
        fontFamily: 'Segoe UI',
        fontSize: '17px',
        color: '#ffc389',
        backgroundColor: '#07111c',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1600);
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE', false) as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    this.shotViews = this.sim.shots.map(() =>
      this.add.rectangle(0, 0, 17, 4, 0x6effff).setDepth(1200).setVisible(false),
    );
    this.sparkViews = this.sim.sparks.map(() =>
      this.add.rectangle(0, 0, 4, 4, 0xffffff).setDepth(1300).setVisible(false),
    );
    this.cameras.main.setBounds(0, 0, 1600, 900);
    this.cameras.main.setZoom(1.03);
    this.cameras.main.startFollow(this.player, true, 0.045, 0.045);
  }
  update(_time: number, delta: number) {
    const live = this.live(),
      s = live.state;
    if (this.lastRound !== s.roundId) {
      this.lastRound = s.roundId;
      this.sim.reset(s.recipe);
    }
    if (this.previousPhase !== s.phase) {
      if (s.phase === 'ENCOUNTER') this.sim.reset(s.recipe, s.gameSummary.playerHealthRatio * 100);
      if (s.phase === 'IDLE') this.sim.reset(null);
      this.previousPhase = s.phase;
    }
    const playable = live.connected && ['IDLE', 'CONTRIBUTION', 'ENCOUNTER'].includes(s.phase);
    const down = (key: string) => live.focused && this.keys[key]!.isDown;
    const pointer = this.input.activePointer;
    const aim = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
    if (playable)
      this.sim.step(
        delta / 1000,
        {
          x: Number(down('D') || down('RIGHT')) - Number(down('A') || down('LEFT')),
          y: Number(down('S') || down('DOWN')) - Number(down('W') || down('UP')),
          aim,
          attack: live.focused && pointer.isDown,
          dash: down('SPACE'),
        },
        s.phase === 'ENCOUNTER',
      );
    const p = this.sim.player;
    this.player
      .setPosition(p.x, p.y - 10)
      .setRotation(p.angle)
      .setDepth(p.y)
      .setAlpha(this.sim.hp <= 0 ? 0.25 : this.sim.time < this.sim.invulnerableUntil ? 0.55 : 1);
    this.shadow.setPosition(p.x + 5, p.y + 12).setDepth(p.y - 1);
    this.bars.clear();
    drawEffects(this.effects, this.sim);
    const boss = this.sim.boss;
    this.bossView
      .setVisible(boss.active)
      .setPosition(boss.x, boss.y - 18)
      .setDepth(boss.y)
      .setRotation(Math.atan2(p.y - boss.y, p.x - boss.x) + Math.PI / 2)
      .setTint(
        boss.hitUntil > this.sim.time
          ? 0xffffff
          : this.sim.time < boss.vulnerableUntil
            ? 0x8bffff
            : 0xffffff,
      );
    this.bossLabel.setText(
      boss.active
        ? `WARDEN / PHASE ${boss.phase} · ${this.sim.time < boss.vulnerableUntil ? 'CORE EXPOSED' : 'ARMORED'}`
        : boss.defeated
          ? 'WARDEN DESTROYED: HOLD THE ARENA'
          : '',
    );
    if (boss.active) {
      this.bars.fillStyle(0x111c2c);
      this.bars.fillRect(600, 100, 400, 9);
      this.bars.fillStyle(this.sim.time < boss.vulnerableUntil ? 0x58f5ff : 0xff8d43);
      this.bars.fillRect(600, 100, (400 * boss.hp) / boss.maxHp, 9);
      if (boss.attackAt - this.sim.time < 1.2) {
        this.bars.lineStyle(3, 0xff9a53, 0.8);
        this.bars.strokeCircle(boss.target.x, boss.target.y, 55);
        this.bars.lineBetween(boss.x, boss.y, boss.target.x, boss.target.y);
      }
    }
    for (const [id, view] of this.enemies)
      if (!this.sim.enemies.some((e) => e.id === id)) {
        view.destroy();
        this.enemies.delete(id);
      }
    for (const e of this.sim.enemies) {
      let view = this.enemies.get(e.id);
      if (!view) {
        view = this.add.image(e.x, e.y, e.kind).setDisplaySize(e.radius * 5, e.radius * 5);
        this.enemies.set(e.id, view);
      }
      view
        .setPosition(e.x, e.y - 10 + Math.sin(this.sim.time * 9 + e.id) * 2)
        .setRotation(Math.atan2(p.y - e.y, p.x - e.x) + Math.PI / 2)
        .setDepth(e.y)
        .setAlpha(e.echo ? 0.55 : Math.min(1, (this.sim.time - e.born) * 2));
      view.setTint(e.hitUntil > this.sim.time ? 0xffffff : 0xcbd5ed);
      if (e.hp < e.maxHp) {
        this.bars.fillStyle(0x101827);
        this.bars.fillRect(e.x - 20, e.y - 38, 40, 4);
        this.bars.fillStyle(0xff775e);
        this.bars.fillRect(e.x - 20, e.y - 38, (40 * e.hp) / e.maxHp, 4);
      }
    }
    this.sim.shots.forEach((s, i) =>
      this.shotViews[i]!.setVisible(s.active)
        .setPosition(s.x, s.y)
        .setRotation(Math.atan2(s.vy, s.vx))
        .setFillStyle(s.friendly ? 0x67f5ff : 0xff824b),
    );
    this.sim.sparks.forEach((s, i) =>
      this.sparkViews[i]!.setVisible(s.active)
        .setPosition(s.x, s.y)
        .setAlpha(Math.min(1, s.life * 3))
        .setFillStyle(s.color),
    );
    if (this.sim.events.some((e) => e.kind === 'hit')) this.cameras.main.shake(110, 0.003);
    this.sim.events = [];
    if (_time - this.lastHud > 100) {
      this.lastHud = _time;
      this.report({
        health: this.sim.hp,
        score: this.sim.score,
        wave: this.sim.wave,
        survival: this.sim.time,
        dash: Math.max(0, this.sim.nextDash - this.sim.time),
        enemies: this.sim.enemies.length,
        fps: Math.round(this.game.loop.actualFps),
      });
    }
    if (
      live.creator &&
      live.connected &&
      s.phase === 'ENCOUNTER' &&
      _time - this.lastTelemetry > 2100
    ) {
      this.lastTelemetry = _time;
      void api('/api/game/telemetry', {
        roundId: s.roundId,
        health: this.sim.hp / 100,
        enemies: this.sim.enemies.length,
      }).catch(() => undefined);
    }
  }
}
