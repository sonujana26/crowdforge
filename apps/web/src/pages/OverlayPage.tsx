import { ingredients, type ContributionRejection, type RoundState } from '@crowdforge/shared';
import { ContributionFeedback } from '../app/ContributionFeedback';
import { IngredientCards } from '../components/IngredientCards';
export function OverlayPage({
  state,
  connected,
  seconds,
  feedback,
}: {
  state: RoundState;
  connected: boolean;
  seconds: number;
  feedback: ContributionRejection | null;
}) {
  const preview = new URLSearchParams(location.search).has('preview');
  const status = preview
    ? 'PREVIEW: SAMPLE DATA'
    : !connected
      ? 'SERVER DISCONNECTED'
      : state.demoMode
        ? 'DEMO MODE'
        : state.twitch.state === 'Connected to Twitch'
          ? 'TWITCH CHAT CONNECTED'
          : state.twitch.state.toUpperCase();
  const counts = preview
    ? ingredients.map((i) => ({ ingredientId: i.id, count: 0, percentage: 0 }))
    : state.counts;
  return (
    <div className={`stream-overlay phase-${state.phase}`}>
      <div className="overlay-top">
        <div className="overlay-brand hud-frame">
          ◈ CROWD<span>FORGE</span>
        </div>
        <div
          className={`overlay-status hud-frame ${connected && state.twitch.state === 'Connected to Twitch' && !state.demoMode ? 'is-live' : ''}`}
        >
          {status}
        </div>
      </div>
      <div className="overlay-event hud-frame" key={`${state.roundId}-${state.phase}`}>
        <div className="overlay-copy">
          <p className="round-label">
            {preview
              ? 'PREVIEW / SAMPLE'
              : `ROUND ${String(state.roundNumber).padStart(2, '0')} / ${state.phase}`}
          </p>
          <h1>
            {preview
              ? 'Orbital Blizzard'
              : state.recipe?.title || (
                  <>
                    Forge the next <em>encounter</em>
                  </>
                )}
          </h1>
          <p>
            {preview
              ? 'Ice + gravity. A new kind of survival.'
              : state.recipe?.tagline || (
                  <>
                    Contribute one ingredient with <b>!forge &lt;ingredient&gt;</b>
                  </>
                )}
          </p>
        </div>
        <strong className="clock">
          {preview ? 24 : seconds}
          <small>SEC</small>
        </strong>
      </div>
      <div className="overlay-middle">
        <div className="overlay-contributors hud-frame">
          <strong>♟ {preview ? '-' : state.distinctContributors}</strong>
          <span>CONTRIBUTORS</span>
        </div>
        <div className="overlay-motto hud-frame">
          Chat designs.
          <br />
          <em>You survive.</em>
        </div>
      </div>
      <div className="overlay-bottom">
        {!preview && <ContributionFeedback feedback={feedback} />}
        <div className="overlay-ticker" role="status">
          {!preview &&
            (state.phase === 'RESULT'
              ? state.lastResult?.survived === true
                ? 'VICTORY: encounter survived'
                : state.lastResult?.survived === false
                  ? 'DEFEAT: the arena prevailed'
                  : 'Encounter complete'
              : state.activity[0]?.text)}
        </div>
        <div className="hud-frame overlay-card-frame">
          <IngredientCards counts={counts} />
        </div>
      </div>
    </div>
  );
}
