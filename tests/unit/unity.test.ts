import { describe, expect, it } from 'vitest';
import { Controller } from '../../apps/server/src/game/controller';
import {
  eligibleTelemetry,
  unityManifestSchema,
  unitySnapshot,
  unityEventSchema,
} from '../../apps/web/src/unity/protocol';
describe('Unity bridge boundary', () => {
  it('validates the local HUD without allowing it to become a server telemetry command', () => {
    const controller = new Controller();
    try {
      const payload = {
        health: 0.75,
        score: 400,
        wave: 2,
        dash: 1.2,
        muted: true,
        bossHealth: 0.8,
        bossPhase: 1,
        bossExposed: false,
      };
      const event = { type: 'hud', payload };
      expect(unityEventSchema.safeParse(event).success).toBe(true);
      expect(eligibleTelemetry(event, controller.snapshot(), true, true)).toBeNull();
      for (const invalid of [
        { health: 2 },
        { score: -1 },
        { wave: 101 },
        { dash: Infinity },
        { bossPhase: 3 },
        { command: 'start' },
      ]) {
        expect(
          unityEventSchema.safeParse({ type: 'hud', payload: { ...payload, ...invalid } }).success,
        ).toBe(false);
      }
    } finally {
      controller.dispose();
    }
  });
  it('distinguishes a paused encounter from a paused contribution on reconnect', () => {
    const controller = new Controller();
    try {
      const state = controller.snapshot();
      state.phase = 'PAUSED';
      expect(unitySnapshot(state, true, 1, 10).encounterActive).toBe(false);
      state.gameSummary.activeEffectIds = ['gravity_well'];
      expect(unitySnapshot(state, true, 2, 10).encounterActive).toBe(true);
    } finally {
      controller.dispose();
    }
  });
  it('copies only bounded game data and preserves phase, demo label and aggregates', () => {
    const controller = new Controller();
    controller.mode(true);
    controller.start();
    try {
      const state = controller.snapshot();
      const packet = unitySnapshot(state, true, 3, 15);
      expect(packet).toMatchObject({
        protocol: 1,
        sequence: 3,
        phase: 'CONTRIBUTION',
        demoMode: true,
        roundId: state.roundId,
        seconds: 15,
      });
      expect(packet.counts).toHaveLength(6);
      expect(packet.contributors).toBe(0);
      for (const field of ['twitch', 'activity', 'csrf', 'session', 'creator', 'aiConfigured'])
        expect(packet).not.toHaveProperty(field);
    } finally {
      controller.dispose();
    }
  });
  it('rejects stale, unauthorized, disconnected and out-of-bounds telemetry', () => {
    const controller = new Controller();
    const state = controller.snapshot();
    state.phase = 'ENCOUNTER';
    try {
      const message = {
        type: 'telemetry',
        payload: { roundId: state.roundId, health: 0.8, enemies: 3 },
      };
      expect(eligibleTelemetry(message, state, true, true)).toEqual(message.payload);
      expect(eligibleTelemetry(message, state, false, true)).toBeNull();
      expect(eligibleTelemetry(message, state, true, false)).toBeNull();
      expect(
        eligibleTelemetry(
          { ...message, payload: { ...message.payload, health: 2 } },
          state,
          true,
          true,
        ),
      ).toBeNull();
      expect(
        eligibleTelemetry(
          { ...message, payload: { ...message.payload, roundId: 'stale' } },
          state,
          true,
          true,
        ),
      ).toBeNull();
      state.phase = 'PAUSED';
      expect(eligibleTelemetry(message, state, true, true)).toBeNull();
    } finally {
      controller.dispose();
    }
  });
  it('only permits local build files and the known bridge protocol', () => {
    const good = {
      protocol: 1,
      loaderUrl: '/unity/Build/UnityWeb.loader.js',
      dataUrl: '/unity/Build/UnityWeb.data',
      frameworkUrl: '/unity/Build/UnityWeb.framework.js',
      codeUrl: '/unity/Build/UnityWeb.wasm',
    };
    expect(unityManifestSchema.safeParse(good).success).toBe(true);
    for (const loaderUrl of [
      'https://evil.test/code.js',
      '/unity/Build/../../code.loader.js',
      '/auth/twitch',
      'javascript:alert(1)',
    ])
      expect(unityManifestSchema.safeParse({ ...good, loaderUrl }).success).toBe(false);
    expect(unityManifestSchema.safeParse({ ...good, protocol: 2 }).success).toBe(false);
  });
});
