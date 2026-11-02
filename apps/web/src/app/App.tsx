import { lazy, Suspense, useEffect, useState } from 'react';
import { ingredients, type Settings } from '@crowdforge/shared';
import { api, sessionInfo } from '../lib/api';
import { useGameState } from '../lib/state';
import { OverlayPage } from '../pages/OverlayPage';
import { LandingPage } from '../pages/LandingPage';
import { ContributionFeedback } from './ContributionFeedback';
import { IngredientCards } from '../components/IngredientCards';
import { RoundBriefingModal } from '../components/RoundBriefingModal';

const UnityArena = lazy(() =>
  import('../unity/UnityArena').then((m) => ({ default: m.UnityArena })),
);
export function App() {
  const { state, connected, seconds, feedback } = useGameState();
  const [creator, setCreator] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState(1);
  const [preRoundOpen, setPreRoundOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const route = location.pathname;
  const unityView = route === '/arena';
  useEffect(() => {
    document.body.classList.toggle('overlay-body', route === '/overlay');
    document.body.dataset.route = route.slice(1) || 'landing';
    document.body.dataset.renderer = unityView ? 'unity' : 'web';
    if (route === '/arena' && !location.search.includes('renderer=unity')) {
      window.history.replaceState(null, '', '/arena?renderer=unity');
    }
    return () => document.body.classList.remove('overlay-body');
  }, [route, unityView]);
  useEffect(() => {
    void sessionInfo()
      .then((s) => setCreator(s.creator))
      .catch(() => setError('Server unavailable.'));
  }, []);
  async function act(path: string, body: unknown = {}) {
    setBusy(true);
    setError('');
    try {
      const result = await api(path, body);
      if (result.accepted === false) setError(result.reason || 'Contribution rejected.');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (!state)
    return (
      <main>
        <h1>CrowdForge</h1>
        <p>Connecting to the game server…</p>
        {error && <p role="alert">{error}</p>}
      </main>
    );
  if (route === '/overlay')
    return (
      <OverlayPage state={state} connected={connected} seconds={seconds} feedback={feedback} />
    );
  const controls = (
    <div className="controls">
      {(['start', 'pause', 'resume', 'advance', 'stop', 'reset'] as const).map((action) => (
        <button
          key={action}
          data-action={action}
          disabled={
            !creator ||
            busy ||
            !connected ||
            (action === 'start' && !['IDLE', 'RESULT'].includes(state.phase)) ||
            (action === 'pause' && ['IDLE', 'PAUSED'].includes(state.phase)) ||
            (action === 'resume' && state.phase !== 'PAUSED') ||
            (action === 'advance' && state.phase !== 'CONTRIBUTION')
          }
          onClick={() => {
            if (action === 'start') {
              setPreRoundOpen(true);
              return;
            }
            if (action !== 'reset' || confirm('Reset round history, counts and active effects?'))
              void act(`/api/game/${action}`);
          }}
        >
          {action === 'advance'
            ? 'Forge now'
            : action === 'reset'
              ? 'Reset all'
              : action.charAt(0).toUpperCase() + action.slice(1)}
        </button>
      ))}
    </div>
  );
  const handleStartRound = () => {
    setPreRoundOpen(false);
    void act('/api/game/start');
  };
  const counts = <IngredientCards counts={state.counts} />;
  return (
    <>
      {route !== '/' && (
        <header>
          <a className="brand" href="/">
            <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2 30 16 16 30 2 16Z M16 9 23 16 16 23 9 16Z" fill="none" stroke="currentColor" strokeWidth="3"/></svg>
            CrowdForge
          </a>
          <nav>
            <a href="/arena">Arena ↗</a>
            <a href="/overlay">Overlay ↗</a>
            <a href="/dashboard">Control room</a>
            <button
              type="button"
              className="briefing-nav-btn"
              onClick={() => setInfoModalOpen(true)}
              title="View round directives & rules"
            >
              ℹ Directives
            </button>
          </nav>
          <span className={connected ? 'server-state is-connected' : 'server-state'}>{connected ? 'Server connected' : 'Server disconnected'}</span>
        </header>
      )}
      <main>
        {route !== '/' && (
          <>
            <RoundBriefingModal
              state={state}
              isOpen={preRoundOpen}
              mode="pre_round"
              onStartRound={handleStartRound}
              onClose={() => setPreRoundOpen(false)}
            />
            <RoundBriefingModal
              state={state}
              isOpen={infoModalOpen}
              mode="info"
              onClose={() => setInfoModalOpen(false)}
            />
            <ContributionFeedback feedback={feedback} />
            {state.demoMode && <div className="demo">DEMO MODE: simulated messages</div>}
            {!connected && (
              <div role="alert" className="error">
                Server disconnected: displayed state may be stale. Reconnecting…
              </div>
            )}
          </>
        )}
        {route === '/' ? (
          <LandingPage connected={connected} />
        ) : (
          <>
            {route !== '/arena' && route !== '/overlay' && (
              <div className="control-room-admin-notice">
                <div className="notice-icon-col">
                  <span className="notice-lock-icon">🔒</span>
                </div>
                <div className="notice-content-col">
                  <div className="notice-header-row">
                    <span className="notice-badge">ADMINISTRATOR &amp; STREAMER CONTROL ROOM</span>
                    <span className="notice-subtag">RESTRICTED BACKSTAGE COCKPIT</span>
                  </div>
                  <p className="notice-desc">
                    <strong>Why access is restricted:</strong> This control room manages live Twitch broadcast sessions. Password protection ensures public viewers cannot interrupt active rounds, trigger unauthorized resets, or alter broadcast parameters during live streams.
                  </p>
                  <p className="notice-role-desc">
                    <strong>What the administrator does:</strong> Connects the Twitch channel IRC feed, initiates timed battle rounds, synthesizes AI encounter recipes, controls the live game loop (Start, Pause, Resume, Stop), and configures encounter intensity for the audience.
                  </p>
                </div>
              </div>
            )}
            {unityView ? (
              <strong className="clock unity-clock">
                {seconds}
                <small> SEC</small>
              </strong>
            ) : (
              <div className="round-heading">
                <div>
                  <p>
                    ROUND {String(state.roundNumber).padStart(2, '0')} / {state.phase}
                  </p>
                  <h1>
                    {state.recipe?.title || (
                      <>
                        The next
                        <br className="hero-break" /> <em>challenge</em> is yours.
                      </>
                    )}
                  </h1>
                  <p>
                    {state.recipe?.tagline || 'One viewer. One ingredient. A whole new encounter.'}
                  </p>
                </div>
                <strong className="clock">
                  {seconds}
                  <small> SEC</small>
                </strong>
              </div>
            )}
            {route === '/arena' ? (
              <Suspense fallback={<p>Loading arena…</p>}>
                <UnityArena
                  state={state}
                  connected={connected}
                  creator={creator}
                  seconds={seconds}
                  controls={controls}
                />
              </Suspense>
            ) : route === '/overlay' ? (
              <>
                {counts}
                <p>{state.distinctContributors} contributors</p>
              </>
            ) : (
              <div className="dashboard-grid">
                <section>
                  <h2>Creator controls</h2>
                  {!creator ? (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (await act('/api/session/login', { password })) {
                          setCreator(true);
                          setPassword('');
                        }
                      }}
                    >
                      <label>
                        Creator password
                        <input
                          type="password"
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </label>
                      <button disabled={busy}>Unlock controls</button>
                    </form>
                  ) : (
                    <p className="session-unlocked">◉ Creator session unlocked</p>
                  )}
                  {controls}
                  <div className="controls">
                    {creator && (
                      <a className="button" href="/auth/twitch">
                        Connect Twitch
                      </a>
                    )}
                    <button
                      disabled={!creator || busy}
                      onClick={() => void act('/api/twitch/disconnect')}
                    >
                      Disconnect Twitch
                    </button>
                  </div>
                  <p>
                    {state.twitch.channel || 'No channel connected'} · EventSub:{' '}
                    {state.twitch.eventSub}
                  </p>
                  <h2>{state.demoMode ? 'Demo mode' : state.twitch.state}</h2>
                  <p>{state.demoMode ? 'Simulated contributions only.' : state.twitch.message}</p>
                  <button
                    disabled={!creator || busy || state.phase !== 'IDLE'}
                    onClick={() => void act('/api/demo/mode', { enabled: !state.demoMode })}
                  >
                    {state.demoMode ? 'Disable demo mode' : 'Enable demo mode'}
                  </button>
                  <p className="ai-status-row">
                    AI: {state.aiConfigured ? (
                      <>
                        <span className="status-text-configured">Configured</span>
                        <button
                          type="button"
                          className="ai-tick-badge"
                          title="AI Engine Active &amp; Verified"
                          aria-label="AI Engine Active &amp; Verified"
                        >
                          <svg viewBox="0 0 20 20" width="12" height="12" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      'Unavailable: fallback enabled'
                    )}
                  </p>
                  {state.recipeSource !== 'none' && (
                    <p>
                      {state.recipeSource === 'fallback'
                        ? 'Fallback recipe'
                        : 'AI-generated recipe'}{' '}
                      · {state.recipeReason}
                    </p>
                  )}
                </section>
                <section>
                  <h2>
                    Community ingredients{' '}
                    <small>{state.distinctContributors} distinct contributors</small>
                  </h2>
                  {counts}
                  {state.distinctContributors === 0 && (
                    <p>
                      No ingredients received yet. A default encounter keeps the round playable.
                    </p>
                  )}
                  <code className="command-guide">
                    !forge ice | !forge gravity | !forge storm | !forge mirror | !forge clones |
                    !forge fire
                  </code>
                  <div className="ingredient-desc-box">
                    <div className="desc-box-header">
                      <span className="desc-badge">ARENA MECHANICS GUIDE</span>
                      <span className="desc-sub">Top 2 ingredients combine into live hazards</span>
                    </div>
                    <div className="desc-legend-grid">
                      <div className="desc-item">
                        <span className="desc-icon" style={{ color: '#80e9ff' }}>❄ Ice</span>
                        <p>Slippery floor with low traction &amp; inertia drift</p>
                      </div>
                      <div className="desc-item">
                        <span className="desc-icon" style={{ color: '#b5a0ff' }}>◎ Gravity</span>
                        <p>Singularities pull marine, shots &amp; mechs to core</p>
                      </div>
                      <div className="desc-item">
                        <span className="desc-icon" style={{ color: '#f8d77b' }}>ϟ Storm</span>
                        <p>Telegraphed lightning strikes &amp; chaining arcs</p>
                      </div>
                      <div className="desc-item">
                        <span className="desc-icon" style={{ color: '#ff9ce0' }}>◇ Mirror</span>
                        <p>Decoys distract mechs; reflective barrier walls</p>
                      </div>
                      <div className="desc-item">
                        <span className="desc-icon" style={{ color: '#7df0bc' }}>◈ Clones</span>
                        <p>Swarming echo mech waves reinforce the arena</p>
                      </div>
                      <div className="desc-item">
                        <span className="desc-icon" style={{ color: '#ffac78' }}>♨ Fire</span>
                        <p>Expanding thermal burn zones dealing damage</p>
                      </div>
                    </div>
                  </div>
                </section>
                <section>
                  <h2>Simulator</h2>
                  <p>DEMO MODE: synthetic viewers, shared contribution pipeline.</p>
                  <label>
                    Demo viewer (1–100)
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={viewer}
                      onChange={(e) => setViewer(Number(e.target.value))}
                    />
                  </label>
                  <div className="controls">
                    {ingredients.map((i) => (
                      <button
                        key={i.id}
                        disabled={
                          !creator || !state.demoMode || state.phase !== 'CONTRIBUTION' || busy
                        }
                        onClick={() =>
                          void act('/api/demo/inject', { viewer, text: `!forge ${i.id}` })
                        }
                      >
                        {i.icon} {i.name}
                      </button>
                    ))}
                  </div>
                  <button
                    disabled={!creator || !state.demoMode || state.phase !== 'CONTRIBUTION' || busy}
                    onClick={async () => {
                      for (let n = 1; n <= 6; n++)
                        await act('/api/demo/inject', {
                          viewer: n,
                          text: `!forge ${ingredients[(n - 1) % 2]!.id}`,
                        });
                    }}
                  >
                    Sample burst (viewers 1–6)
                  </button>
                  <p>
                    Viewer eligibility resets each round; repeated commands do not add influence.
                  </p>
                </section>
                <section>
                  <h2>Stream links</h2>
                  <div className="controls">
                    {['/arena', '/overlay'].map((path) => (
                      <button
                        key={path}
                        onClick={() => {
                          void navigator.clipboard
                            .writeText(location.origin + path)
                            .then(() => setError('Copied ' + path + ' URL'))
                            .catch(() => setError(location.origin + path));
                        }}
                      >
                        Copy {path} URL
                      </button>
                    ))}
                  </div>
                  <p>
                    OBS browser source: 1920 × 1080 or 1280 × 720. Use /overlay?preview=1 for
                    labelled sample data.
                  </p>
                  <h2>Round settings</h2>
                  <form
                    key={JSON.stringify(state.settings)}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const data = new FormData(e.currentTarget);
                      const settings: Settings = {
                        contributionSeconds: Number(data.get('contribution')),
                        encounterSeconds: Number(data.get('encounter')),
                        intensity: data.get('intensity') as Settings['intensity'],
                        autoNext: data.has('autoNext'),
                        sound: data.has('sound'),
                      };
                      void act('/api/settings', settings);
                    }}
                  >
                    <label>
                      Contribution seconds
                      <input
                        name="contribution"
                        type="number"
                        min={5}
                        max={60}
                        defaultValue={state.settings.contributionSeconds}
                      />
                    </label>
                    <label>
                      Encounter seconds
                      <input
                        name="encounter"
                        type="number"
                        min={15}
                        max={35}
                        defaultValue={state.settings.encounterSeconds}
                      />
                    </label>
                    <label>
                      Intensity
                      <select name="intensity" defaultValue={state.settings.intensity}>
                        <option>low</option>
                        <option>medium</option>
                        <option>high</option>
                      </select>
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        name="autoNext"
                        defaultChecked={state.settings.autoNext}
                      />{' '}
                      Auto-next
                    </label>
                    <label>
                      <input type="checkbox" name="sound" defaultChecked={state.settings.sound} />{' '}
                      Sound effects (click arena to enable audio)
                    </label>
                    <button disabled={!creator || busy || state.phase !== 'IDLE'}>
                      Save while idle
                    </button>
                  </form>
                </section>
                <section>
                  <h2>Activity</h2>
                  {state.activity.map((a, i) => (
                    <p key={i}>
                      <small>{a.source === 'demo' ? 'DEMO' : a.source.toUpperCase()}</small>{' '}
                      {a.text}
                    </p>
                  ))}
                </section>
              </div>
            )}
            {state.lastResult && (route !== '/arena' || state.phase === 'RESULT') && (
              <section className="result">
                <h2>
                  {state.lastResult.survived === null
                    ? 'Encounter complete: no player result reported'
                    : state.lastResult.survived
                      ? 'SURVIVED'
                      : 'ARENA OVERWHELMED'}
                </h2>
                <p>
                  {state.lastResult.distinctContributors
                    ? `${state.lastResult.distinctContributors} viewers shaped ${state.lastResult.recipe?.title}.`
                    : 'No ingredients received: default encounter.'}{' '}
                  {Math.round(state.lastResult.survivalSeconds)} seconds.
                </p>
              </section>
            )}
          </>
        )}
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
      </main>
    </>
  );
}
