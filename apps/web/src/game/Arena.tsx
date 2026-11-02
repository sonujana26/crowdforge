import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { effectCatalog, type RoundState } from '@crowdforge/shared';
import { ArenaScene, type ArenaHud } from './ArenaScene';
export function Arena({
  state,
  connected,
  creator,
}: {
  state: RoundState;
  connected: boolean;
  creator: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.35);
  const [hud, setHud] = useState<ArenaHud>({
    health: 100,
    score: 0,
    wave: 1,
    survival: 0,
    dash: 0,
    enemies: 0,
    fps: 0,
  });
  const live = useRef({ state, connected, creator, focused, muted, volume });
  live.current = { state, connected, creator, focused, muted, volume };
  useEffect(() => {
    const scene = new ArenaScene(() => live.current, setHud);
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current!,
      width: 1600,
      height: 900,
      backgroundColor: '#030a12',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene,
      audio: { noAudio: true },
      render: { antialias: true },
      fps: { target: 60 },
    });
    const node = host.current!;
    const key = (event: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code))
        event.preventDefault();
    };
    node.addEventListener('keydown', key);
    return () => {
      node.removeEventListener('keydown', key);
      game.destroy(true);
    };
  }, []);
  return (
    <div className="arena-shell">
      <div className="game-hud">
        <div className="health-readout">
          ♥ HEALTH {Math.ceil(hud.health)}%
          <progress max={100} value={hud.health} aria-label="Player health" />
        </div>
        <span>
          SCORE {hud.score.toLocaleString()} · WAVE {hud.wave}
        </span>
        <span>{hud.dash > 0 ? `DASH ${hud.dash.toFixed(1)}s` : 'DASH READY'}</span>
      </div>
      <div
        className="canvas-host"
        ref={host}
        tabIndex={0}
        role="application"
        aria-label="CrowdForge arena. WASD or arrows move, Space dashes, mouse aims, left click attacks."
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onClick={() => host.current?.focus()}
      />
      {(!connected || state.phase === 'PAUSED' || hud.health <= 0) && (
        <div className="arena-state">
          {!connected ? 'CONNECTION LOST' : state.phase === 'PAUSED' ? 'PAUSED' : 'DEFEAT'}
          <small>
            {hud.health <= 0 ? 'Start a new round to redeploy.' : 'Simulation suspended'}
          </small>
        </div>
      )}
      <div className="game-footer">
        <span>
          {focused
            ? 'WASD / ARROWS: MOVE · SPACE: DASH · MOUSE: AIM · LEFT CLICK: ATTACK'
            : 'Click the arena to take control'}{' '}
          · {hud.fps} FPS
        </span>
        <button onClick={() => setMuted(!muted)}>{muted ? 'Enable audio' : 'Mute audio'}</button>
        <label>
          Volume{' '}
          <input
            aria-label="Master volume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="effect-badges">
        {state.recipe?.effectIds.map((id) => (
          <span key={id} title={effectCatalog[id].description}>
            {effectCatalog[id].name}
          </span>
        ))}
      </div>
      {!creator && (
        <p className="practice-note">
          Practice view: unlock the creator session in the control room to report survival.
        </p>
      )}
    </div>
  );
}
