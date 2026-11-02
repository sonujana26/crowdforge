import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { UnityHud } from '@crowdforge/shared/unity';
import type { RoundState } from '@crowdforge/shared';
import { api } from '../lib/api';
import {
  eligibleTelemetry,
  unityEventSchema,
  unityManifestSchema,
  unitySnapshot,
} from './protocol';
interface UnityInstance {
  SendMessage(object: string, method: string, value: string): void;
  Quit(): Promise<void>;
  SetFullscreen(value: number): void;
}
declare global {
  interface Window {
    createUnityInstance?: (
      canvas: HTMLCanvasElement,
      config: Record<string, unknown>,
      progress: (value: number) => void,
    ) => Promise<UnityInstance>;
  }
}
export function UnityArena({
  state,
  connected,
  creator,
  seconds,
  controls,
}: {
  state: RoundState;
  connected: boolean;
  creator: boolean;
  seconds: number;
  controls: ReactNode;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    instance = useRef<UnityInstance | null>(null);
  const live = useRef({ state, connected, creator, seconds });
  live.current = { state, connected, creator, seconds };
  const [status, setStatus] = useState('Loading the arena...'),
    [progress, setProgress] = useState(0),
    [displayProgress, setDisplayProgress] = useState(5),
    [loaded, setLoaded] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState('');
  const [hud, setHud] = useState<UnityHud | null>(null);
  const [qualityMode, setQualityMode] = useState<
    'auto' | 'high' | 'balanced' | 'performance' | 'battery'
  >('auto');

  const isReadyRef = useRef(ready);
  isReadyRef.current = ready;
  const unityProgressRef = useRef(progress);
  unityProgressRef.current = progress;

  useEffect(() => {
    let current = 5;
    const startTime = performance.now();
    const duration = 2600;

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const timeTarget = Math.min(88, (elapsed / duration) * 88);
      const realTarget = unityProgressRef.current * 100;

      if (isReadyRef.current) {
        current = Math.min(100, Math.max(current + 4, 94));
        setDisplayProgress(Math.round(current));
        if (current >= 100) {
          clearInterval(interval);
          setTimeout(() => setLoaded(true), 400);
        }
      } else {
        const target = Math.min(92, Math.max(timeTarget, realTarget));
        if (current < target) {
          current = Math.min(target, current + Math.max(0.7, (target - current) * 0.1));
          setDisplayProgress(Math.round(current));
        }
      }
    }, 35);

    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    let disposed = false,
      sequence = 0,
      runtimeReady = false,
      lastTelemetry = -Infinity;
    const abort = new AbortController();
    const script = document.createElement('script');
    const send = () => {
      const s = live.current;
      if (!disposed && runtimeReady && instance.current)
        instance.current.SendMessage(
          'CrowdForgeBridge',
          'ReceiveSnapshot',
          JSON.stringify(unitySnapshot(s.state, s.connected, ++sequence, s.seconds)),
        );
    };
    const receive = (event: Event) => {
      const raw = (event as CustomEvent).detail;
      if (typeof raw !== 'string' || raw.length > 1024) return;
      try {
        const parsed = unityEventSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) return;
        if (parsed.data.type === 'ready') {
          runtimeReady = true;
          if (instance.current) {
            setReady(true);
            send();
          }
          return;
        }
        if (parsed.data.type === 'hud') {
          setHud(parsed.data.payload);
          return;
        }
        const s = live.current,
          payload = eligibleTelemetry(parsed.data, s.state, s.creator, s.connected);
        if (payload && performance.now() - lastTelemetry >= 2050) {
          lastTelemetry = performance.now();
          void api('/api/game/telemetry', payload).catch(() =>
            setStatus('Telemetry unavailable: unlock the creator session again.'),
          );
        }
      } catch {}
    };
    window.addEventListener('crowdforge:unity', receive);
    const heartbeat = setInterval(send, 250);
    const watchdog = setTimeout(() => {
      if (!disposed && !runtimeReady)
        setError('Unity did not become ready. Check the Web build and browser console.');
    }, 120000);
    void (async () => {
      try {
        const response = await fetch('/unity/manifest.json', {
          signal: abort.signal,
          cache: 'no-store',
        });
        if (!response.ok)
          throw new Error(
            'Unity Web build is not installed. Build the Unity project using docs/UNITY_SETUP.md.',
          );
        const manifest = unityManifestSchema.parse(await response.json());
        await new Promise<void>((resolve, reject) => {
          script.src = manifest.loaderUrl;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Unity loader failed to load.'));
          document.head.appendChild(script);
        });
        if (disposed) return;
        if (!window.createUnityInstance) throw new Error('Invalid Unity loader.');
        setStatus('Loading the 3D arena…');
        const game = await window.createUnityInstance(
          canvas.current!,
          {
            dataUrl: manifest.dataUrl,
            frameworkUrl: manifest.frameworkUrl,
            codeUrl: manifest.codeUrl,
            streamingAssetsUrl: '/unity/StreamingAssets',
            companyName: 'CrowdForge',
            productName: 'CrowdForge Arena',
            productVersion: '0.1',
            devicePixelRatio: Math.min(window.devicePixelRatio || 1, 1.0),
          },
          (p) => {
            if (!disposed) setProgress(p);
          },
        );
        if (disposed) {
          await game.Quit();
          return;
        }
        instance.current = game;
        if (runtimeReady) {
          setReady(true);
          send();
        }
      } catch (e) {
        clearTimeout(watchdog);
        if (!disposed) setError(e instanceof Error ? e.message : 'Unity could not start.');
      }
    })();
    return () => {
      disposed = true;
      abort.abort();
      clearInterval(heartbeat);
      clearTimeout(watchdog);
      window.removeEventListener('crowdforge:unity', receive);
      script.remove();
      const game = instance.current;
      instance.current = null;
      void game?.Quit();
    };
  }, []);
  return (
    <div className="unity-arena">
      <div className="unity-viewport">
        <canvas
          id="crowdforge-unity-canvas"
          ref={canvas}
          width={1600}
          height={900}
          tabIndex={0}
          aria-label="Unity 3D arena. WASD or arrows move. Space dashes. Mouse aims. Left click attacks."
          onClick={() => canvas.current?.focus()}
        />
        {ready && (
          <div className="unity-left-hud">
            {hud && (
              <aside className="unity-vitals" aria-label="Player status">
                <div className="vital-round-header">
                  <span className="vital-round-tag">
                    ROUND {String(state.roundNumber).padStart(2, '0')}
                  </span>
                  <span className={`vital-phase-tag phase-${state.phase.toLowerCase()}`}>
                    {state.phase}
                  </span>
                </div>
                {state.recipe?.title && (
                  <div className="vital-recipe-title">{state.recipe.title}</div>
                )}
                <div className="vital-divider" />
                <div className="vital-heading">
                  <span aria-hidden="true">♥</span> HEALTH{' '}
                  <strong>{Math.ceil(hud.health * 100)}%</strong>
                </div>
                <div
                  className="health-track"
                  role="progressbar"
                  aria-label="Player health"
                  aria-valuenow={Math.ceil(hud.health * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <i style={{ width: `${hud.health * 100}%` }} />
                </div>
                <div className="vital-row">
                  <span>◈</span> SCORE <strong>{hud.score.toLocaleString()}</strong>
                </div>
                <div className="vital-row">
                  <span>◉</span> WAVE <strong>{String(hud.wave).padStart(2, '0')}</strong>
                </div>
                <div className="vital-row">
                  <span>↯</span> DASH{' '}
                  <strong>{hud.dash > 0 ? `${hud.dash.toFixed(1)}s` : 'READY'}</strong>
                </div>
                <button
                  className="sound-toggle"
                  onClick={() =>
                    instance.current?.SendMessage(
                      'CrowdForgeBridge',
                      'SetMuted',
                      hud.muted ? 'false' : 'true',
                    )
                  }
                >
                  <kbd>M</kbd> {hud.muted ? 'Enable sound' : 'Mute sound'}
                </button>
              </aside>
            )}
            <p role="status" className="unity-session">
              {status.includes('Telemetry') ? (
                status
              ) : creator ? (
                <>
                  <strong>◉ Creator session active</strong>
                  <span>Survival reporting is enabled.</span>
                </>
              ) : (
                <>
                  <strong>◉ Practice view</strong>
                  <span>Unlock creator controls to report survival.</span>
                </>
              )}
            </p>
          </div>
        )}
        {ready && hud && hud.bossPhase > 0 && (
          <div className="unity-boss" aria-label="Boss health">
            <div>
              <strong>WARDEN</strong>
              <span>
                PHASE {hud.bossPhase} · {hud.bossExposed ? 'CORE EXPOSED' : 'ARMORED'}
              </span>
            </div>
            <progress max={1} value={hud.bossHealth} />
          </div>
        )}
        {ready && hud && (state.phase === 'PAUSED' || (state.phase === 'ENCOUNTER' && hud.health <= 0)) && (
          <div className="unity-state">
            <strong>{hud.health <= 0 ? 'DEFEAT' : 'PAUSED'}</strong>
            <span>
              {hud.health <= 0
                ? 'Start a new round to redeploy.'
                : 'Waiting for the creator to resume.'}
            </span>
          </div>
        )}
        {!loaded && (
          <div className="unity-loading-screen" role="status">
            <div
              className="unity-loading-bg"
              style={{ backgroundImage: "url('/img/background02.webp')" }}
            />
            <div className="unity-loading-vignette" />

            <div className="unity-loading-content">
              <div className="unity-loading-logo">
                <svg viewBox="0 0 32 32" aria-hidden="true">
                  <path
                    d="M16 2 30 16 16 30 2 16Z M16 9 23 16 16 23 9 16Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.8"
                  />
                </svg>
              </div>

              <h1 className="unity-loading-title">
                Crowd<span>Forge</span>
              </h1>

              <div className="unity-loading-eyebrow-row">
                <span className="unity-eyebrow-line" />
                <span className="unity-eyebrow-text">INTERACTIVE SURVIVAL ARENA</span>
                <span className="unity-eyebrow-line" />
              </div>

              <div className="unity-hex-badge-wrap">
                <svg className="unity-hex-badge-svg" viewBox="0 0 380 54" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="unityHexStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#f0abfc" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity="0.8" />
                    </linearGradient>
                    <filter id="hexGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#c084fc" floodOpacity="0.65" />
                    </filter>
                  </defs>
                  <polygon
                    points="20,2 360,2 378,27 360,52 20,52 2,27"
                    fill="#000000"
                    stroke="url(#unityHexStroke)"
                    strokeWidth="1.8"
                    filter="url(#hexGlow)"
                  />
                  <line x1="2" y1="27" x2="378" y2="27" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="1" />
                </svg>
                <div className="unity-hex-badge-inner">
                  <svg className="unity-cube-svg" viewBox="0 0 256 263" fill="currentColor">
                    <path d="M166.9 131.2L212.8 52l22.2 79.2-22.2 79.3-46-79.3zm-22.4 13l46 79.2-80-20.5L52.6 144h91.8zM190.4 39l-45.9 79.3H52.7l57.7-58.8 80-20.5zm65.5 65.2L228 0 123.4 28l-15.5 27.2-31.4-.2L0 131.2l76.5 76.3 31.4-.2 15.5 27.2 104.5 27.9 28-104.2-15.9-27 16-27z" />
                  </svg>
                  <span className="unity-hex-title">UNITY 6 / 3D ARENA</span>
                </div>
              </div>

              <p className="unity-loading-status-text">
                {error ? error : status.includes('Telemetry') ? 'Loading the arena...' : status}
              </p>

              <div className="unity-progress-wrap">
                <div className="unity-progress-track">
                  <div
                    className="unity-progress-stripes"
                    style={{ width: `${Math.max(6, Math.min(100, Math.round(displayProgress)))}%` }}
                  />
                </div>
                <div className="unity-progress-pct-badge">
                  {Math.round(displayProgress)}%
                </div>
              </div>

              <div className="unity-loading-pills-row">
                <div className="unity-feature-pill">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                  <span>3D Arena</span>
                </div>

                <div className="unity-feature-pill">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                  <span>Real-time Events</span>
                </div>

                <div className="unity-feature-pill">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                    <path d="M4 2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4l-4 4-4-4H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm4 6v4h2V8H8zm6 0v4h2V8h-2z" />
                  </svg>
                  <span>Twitch Chat Driven</span>
                </div>

                <div className="unity-feature-pill">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                    <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H9v2H7v-2H5v-2h2V9h2v2h2v2zm4.5 1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
                  </svg>
                  <span>Interactive Gameplay</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {loaded && (
        <div className="game-footer">
        <span>
          <b>{ready ? 'Unity runtime ready' : 'Loading Unity'}</b> · WASD / ARROWS: MOVE
          <br />
          SPACE: DASH · MOUSE: AIM · CLICK: FIRE
        </span>
        {controls}
        <button
          disabled={!ready}
          title="Toggle performance profile (Auto 60 FPS / High / Balanced / Performance / 30 FPS Lock)"
          onClick={() => {
            const nextMap: Record<string, 'auto' | 'high' | 'balanced' | 'performance' | 'battery'> =
              {
                auto: 'high',
                high: 'balanced',
                balanced: 'performance',
                performance: 'battery',
                battery: 'auto',
              };
            const next = nextMap[qualityMode] || 'auto';
            setQualityMode(next);
            instance.current?.SendMessage('CrowdForgeBridge', 'SetQuality', next);
          }}
        >
          {qualityMode === 'auto'
            ? '⚡ AUTO 60'
            : qualityMode === 'high'
              ? '✨ HIGH 60'
              : qualityMode === 'balanced'
                ? '⚖ BALANCED'
                : qualityMode === 'performance'
                  ? '🚀 PERFORMANCE'
                  : '🔋 30 FPS LOCK'}
        </button>
        <button disabled={!ready} onClick={() => instance.current?.SetFullscreen(1)}>
          Fullscreen
        </button>
      </div>
      )}
    </div>
  );
}
