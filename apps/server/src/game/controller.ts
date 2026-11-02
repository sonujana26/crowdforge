import { randomUUID } from 'node:crypto';
import {
  defaultSettings,
  duplicateContributionMessage,
  ingredientIds,
  recipeSchema,
  type EventRecipe,
  type NormalizedChatMessage,
  type RoundPhase,
  type RoundState,
  type Settings,
  type ContributionRejection,
} from '@crowdforge/shared';
import { Contributions } from './contributions.js';
import { fallback } from './fallback.js';
export type Director = (
  state: RoundState,
) => Promise<{ recipe: EventRecipe; source: 'ai' | 'fallback'; reason: string }>;
export class Controller {
  private votes = new Contributions();
  private timer?: ReturnType<typeof setTimeout>;
  private savedPhase: RoundPhase = 'IDLE';
  private generation = 0;
  private pending?: Awaited<ReturnType<Director>>;
  private encounterElapsed = 0;
  private telemetryAt = 0;
  private lastRejectionAt = 0;
  state: RoundState = {
    roundId: randomUUID(),
    roundNumber: 0,
    phase: 'IDLE',
    phaseStartedAt: null,
    phaseEndsAt: null,
    remainingMs: null,
    counts: this.votes.snapshot(),
    distinctContributors: 0,
    topIngredientIds: [],
    recipe: null,
    recipeSource: 'none',
    recipeReason: '',
    gameSummary: {
      playerHealthRatio: 1,
      enemyCount: 0,
      difficulty: 'medium',
      activeEffectIds: [],
      recentEffectIds: [],
    },
    lastResult: null,
    demoMode: false,
    settings: { ...defaultSettings },
    activity: [],
    aiConfigured: false,
    serverNow: Date.now(),
    twitch: {
      state: 'Authentication required',
      eventSub: 'Disconnected',
      channel: null,
      message: 'Connect your own Twitch channel or explicitly enable demo mode.',
      lastMessageAt: null,
    },
  };
  constructor(
    private publish: (state: RoundState, event: string) => void = () => {},
    private director?: Director,
    private reject: (feedback: ContributionRejection) => void = () => {},
  ) {}
  snapshot(): RoundState {
    return structuredClone({ ...this.state, serverNow: Date.now() });
  }
  emit(event = 'state:snapshot') {
    this.publish(this.snapshot(), event);
  }
  note(text: string, source: 'demo' | 'twitch' | 'system' = 'system') {
    this.state.activity = [{ text, source, at: Date.now() }, ...this.state.activity].slice(0, 8);
  }
  private phase(phase: RoundPhase, ms?: number) {
    clearTimeout(this.timer);
    this.state.phase = phase;
    this.state.phaseStartedAt = Date.now();
    this.state.phaseEndsAt = ms === undefined ? null : Date.now() + ms;
    this.state.remainingMs = null;
    if (ms !== undefined) {
      const generation = this.generation;
      this.timer = setTimeout(() => {
        if (generation === this.generation) this.advance();
      }, ms);
    }
    this.note(`Round ${this.state.roundNumber}: ${phase}`);
    this.emit('round:phase');
  }
  start() {
    if (!['IDLE', 'RESULT'].includes(this.state.phase))
      throw new Error('Stop the current round first.');
    this.generation++;
    this.pending = undefined;
    this.votes = new Contributions();
    this.encounterElapsed = 0;
    this.telemetryAt = 0;
    this.state.activity = [];
    Object.assign(this.state, {
      roundId: randomUUID(),
      roundNumber: this.state.roundNumber + 1,
      counts: this.votes.snapshot(),
      distinctContributors: 0,
      topIngredientIds: [],
      recipe: null,
      recipeSource: 'none',
      recipeReason: '',
      lastResult: null,
    });
    this.state.gameSummary = {
      ...this.state.gameSummary,
      playerHealthRatio: 1,
      enemyCount: 0,
      activeEffectIds: [],
      difficulty: this.state.settings.intensity,
    };
    this.phase('CONTRIBUTION', this.state.settings.contributionSeconds * 1000);
  }
  ingest(message: NormalizedChatMessage) {
    if (this.state.phase !== 'CONTRIBUTION')
      return { accepted: false, reason: 'Contribution window closed' };
    if ((message.source === 'demo') !== this.state.demoMode)
      return { accepted: false, reason: 'Source does not match round mode' };
    const outcome = this.votes.accept(message);
    const accepted = ingredientIds.includes(outcome as (typeof ingredientIds)[number]);
    if (accepted) {
      this.state.counts = this.votes.snapshot();
      this.state.distinctContributors = this.votes.total;
      this.state.topIngredientIds = this.votes.top();
    }
    if (outcome === 'Viewer already contributed') {
      const feedback: ContributionRejection = {
        eventId: randomUUID(),
        roundId: this.state.roundId,
        source: message.source,
        reason: 'already_contributed',
        message: duplicateContributionMessage,
        at: Date.now(),
      };
      console.info('contribution:rejected', feedback);
      this.reject(feedback);
    }
    if (accepted || Date.now() - this.lastRejectionAt >= 1000) {
      this.note(accepted ? `Ingredient accepted: ${outcome}` : outcome, message.source);
      this.emit('contribution:update');
      if (!accepted) this.lastRejectionAt = Date.now();
    }
    return {
      accepted,
      reason: outcome === 'Viewer already contributed' ? duplicateContributionMessage : outcome,
    };
  }
  advance() {
    switch (this.state.phase) {
      case 'CONTRIBUTION':
        void this.forge();
        break;
      case 'REVEAL':
        this.state.gameSummary.activeEffectIds = this.state.recipe!.effectIds;
        this.phase('ENCOUNTER', this.state.recipe!.durationSeconds * 1000);
        this.emit('game:event:start');
        break;
      case 'ENCOUNTER':
        this.finish();
        break;
      case 'RESULT':
        if (this.state.settings.autoNext) this.start();
        else this.stop();
        break;
    }
  }
  private async forge() {
    this.phase('FORGING');
    const generation = this.generation;
    const roundId = this.state.roundId;
    this.emit('forge:started');
    let result: Awaited<ReturnType<Director>>;
    try {
      result = this.director
        ? await this.director(this.snapshot())
        : {
            recipe: fallback(this.votes.top(), this.state.settings),
            source: 'fallback',
            reason: 'AI unavailable: deterministic fallback',
          };
      recipeSchema.parse(result.recipe);
    } catch {
      result = {
        recipe: fallback(this.votes.top(), this.state.settings),
        source: 'fallback',
        reason: 'Invalid director response: fallback',
      };
    }
    if (generation !== this.generation || roundId !== this.state.roundId) return;
    if (this.state.phase === 'PAUSED') {
      this.pending = result;
      return;
    }
    this.reveal(result);
  }
  private reveal(result: Awaited<ReturnType<Director>>) {
    this.state.recipe = result.recipe;
    this.state.recipeSource = result.source;
    this.state.recipeReason = result.reason;
    this.phase('REVEAL', 3000);
    this.emit('forge:complete');
  }
  pause() {
    if (!['CONTRIBUTION', 'FORGING', 'REVEAL', 'ENCOUNTER', 'RESULT'].includes(this.state.phase))
      throw new Error('No active phase to pause.');
    this.savedPhase = this.state.phase;
    if (this.savedPhase === 'ENCOUNTER')
      this.encounterElapsed += Date.now() - this.state.phaseStartedAt!;
    const remaining =
      this.state.phaseEndsAt === null ? null : Math.max(0, this.state.phaseEndsAt - Date.now());
    this.phase('PAUSED');
    this.state.remainingMs = remaining;
    this.emit();
  }
  resume() {
    if (this.state.phase !== 'PAUSED') throw new Error('Round is not paused.');
    if (this.pending) {
      const result = this.pending;
      this.pending = undefined;
      this.reveal(result);
    } else this.phase(this.savedPhase, this.state.remainingMs ?? undefined);
  }
  stop(reset = false) {
    this.generation++;
    this.pending = undefined;
    this.state.gameSummary.activeEffectIds = [];
    this.state.recipe = null;
    if (reset) {
      this.state.recipeSource = 'none';
      this.state.recipeReason = '';
      this.state.roundNumber = 0;
      this.state.lastResult = null;
      this.votes = new Contributions();
      this.state.counts = this.votes.snapshot();
      this.state.distinctContributors = 0;
      this.state.topIngredientIds = [];
      this.state.activity = [];
    }
    this.phase('IDLE');
    this.emit('game:event:end');
  }
  configure(settings: Settings) {
    if (this.state.phase !== 'IDLE') throw new Error('Change settings while idle.');
    this.state.settings = settings;
    this.emit();
  }
  mode(demo: boolean) {
    if (this.state.phase !== 'IDLE') throw new Error('Stop the round before changing mode.');
    if (demo !== this.state.demoMode) this.stop(true);
    this.state.demoMode = demo;
    this.emit('connection:status');
  }
  telemetry(roundId: string, health: number, enemies: number) {
    if (
      roundId !== this.state.roundId ||
      this.state.phase !== 'ENCOUNTER' ||
      Date.now() - this.telemetryAt < 2000
    )
      return;
    this.telemetryAt = Date.now();
    this.state.gameSummary.playerHealthRatio = health;
    this.state.gameSummary.enemyCount = enemies;
    if (health === 0) this.finish();
    else this.emit();
  }
  private finish() {
    this.encounterElapsed += Date.now() - this.state.phaseStartedAt!;
    this.state.lastResult = {
      roundId: this.state.roundId,
      survived:
        this.telemetryAt && Date.now() - this.telemetryAt <= 5000
          ? this.state.gameSummary.playerHealthRatio > 0
          : null,
      survivalSeconds: Math.min(this.state.recipe!.durationSeconds, this.encounterElapsed / 1000),
      contributions: this.votes.total,
      distinctContributors: this.votes.total,
      counts: this.votes.snapshot(),
      recipe: this.state.recipe,
      recipeSource: this.state.recipeSource,
    };
    this.state.gameSummary.recentEffectIds = this.state.recipe!.effectIds;
    this.state.gameSummary.activeEffectIds = [];
    this.phase('RESULT', 6000);
    this.emit('round:result');
  }
  dispose() {
    this.generation++;
    clearTimeout(this.timer);
  }
}
