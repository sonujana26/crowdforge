import { useEffect, useRef, useState } from 'react';
import type { RoundState } from '@crowdforge/shared';

export function RoundBriefingModal({
  state,
  isOpen,
  mode = 'pre_round',
  onStartRound,
  onClose,
}: {
  state: RoundState;
  isOpen: boolean;
  mode?: 'pre_round' | 'info';
  onStartRound?: () => void;
  onClose: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(5);

  const onStartRef = useRef(onStartRound);
  onStartRef.current = onStartRound;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen || mode !== 'pre_round') return;

    setTimeLeft(5);
    const duration = 5000;
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));

      setTimeLeft((prev) => (prev !== remaining ? remaining : prev));

      if (elapsed >= duration) {
        clearInterval(interval);
        onStartRef.current?.();
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handleSkipAndStart = () => {
    onStartRef.current?.();
  };

  const handleCancel = () => {
    onCloseRef.current();
  };

  const roundNum =
    mode === 'pre_round'
      ? state.roundNumber + 1
      : state.roundNumber || 1;

  return (
    <div
      className="briefing-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="briefing-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (mode === 'pre_round') handleSkipAndStart();
          else handleCancel();
        }
      }}
    >
      <div className="briefing-card">
        <button
          className="briefing-close-x"
          onClick={mode === 'pre_round' ? handleSkipAndStart : handleCancel}
          aria-label={mode === 'pre_round' ? 'Skip timer and start round now' : 'Close briefing'}
          title={mode === 'pre_round' ? 'Cancel 5s timer & start immediately' : 'Close'}
        >
          ✕
        </button>

        <div className="briefing-header">
          <span className="briefing-tag">
            ROUND {String(roundNum).padStart(2, '0')} {mode === 'pre_round' ? 'PREPARATION' : 'DIRECTIVES'}
          </span>
          <h2 id="briefing-title">Battlefield Directives &amp; Rules</h2>
          <p className="briefing-subtitle">
            {mode === 'pre_round'
              ? `Round ${roundNum} will start in ${timeLeft}s: review directives below!`
              : 'One viewer. One ingredient. A whole new encounter.'}
          </p>
        </div>

        <div className="briefing-grid">
          <div className="briefing-col">
            <h3>💬 1. What Viewers Do</h3>
            <p>
              Audience types commands in Twitch chat to vote for arena ingredients:
            </p>
            <div className="briefing-commands">
              <code>!forge ice</code>
              <code>!forge gravity</code>
              <code>!forge storm</code>
              <code>!forge mirror</code>
              <code>!forge clones</code>
              <code>!forge fire</code>
            </div>
            <p className="briefing-note">
              ★ <strong>1 vote per viewer per round.</strong> Spamming does not inflate influence.
            </p>
          </div>

          <div className="briefing-col">
            <h3>🌀 2. What Will Happen in the Arena</h3>
            <p>
              When the contribution timer ends, the <strong>AI Game Director</strong> synthesizes the top ingredients into physical arena hazards:
            </p>
            <ul className="briefing-hazards">
              <li><strong>Ice:</strong> Slippery floor &amp; frozen drift inertia.</li>
              <li><strong>Gravity:</strong> Singularities pulling player &amp; bullets.</li>
              <li><strong>Storm / Fire:</strong> Lightning strikes &amp; burning zones.</li>
              <li><strong>Mirror / Clones:</strong> Decoys &amp; extra mech swarms.</li>
            </ul>
          </div>

          <div className="briefing-col">
            <h3>🎯 3. Streamer Objective</h3>
            <p>
              Survive the transformed arena against the enemy mechs and the Warden Colossus boss for the round duration!
            </p>
            <div className="briefing-controls-tip">
              <span><b>WASD</b>: Move</span> · <span><b>Space</b>: Dash</span> · <span><b>Mouse / Click</b>: Aim &amp; Shoot</span>
            </div>
          </div>
        </div>

        <div className="briefing-footer">
          {mode === 'pre_round' ? (
            <>
              <div className="briefing-timer-info">
                <span className="briefing-timer-label">
                  Auto-starting Round {roundNum} in {timeLeft}s…
                </span>
                <div className="briefing-timer-bar">
                  <div
                    className="briefing-timer-fill"
                    style={{ width: `${(timeLeft / 5) * 100}%` }}
                  />
                </div>
              </div>
              <div className="briefing-action-group">
                <button
                  type="button"
                  className="briefing-secondary-btn"
                  onClick={handleCancel}
                  title="Abort starting round"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="briefing-cancel-btn"
                  onClick={handleSkipAndStart}
                  title="Cancel 5s timer and launch immediately"
                >
                  ▶ Start Now ({timeLeft}s)
                </button>
              </div>
            </>
          ) : (
            <div style={{ marginLeft: 'auto' }}>
              <button
                type="button"
                className="briefing-cancel-btn"
                onClick={handleCancel}
              >
                ✕ Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
