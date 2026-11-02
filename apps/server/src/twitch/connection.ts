import { z } from 'zod';
import type { Controller } from '../game/controller.js';
import { EventSubClient, type SocketFactory } from './eventsub.js';
export interface TwitchConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}
const tokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z.number().positive(),
});
const identitySchema = z.object({
  client_id: z.string(),
  user_id: z.string().min(1),
  login: z.string().min(1).max(100),
  scopes: z.array(z.string()),
  expires_in: z.number().nonnegative(),
});
export class TwitchConnection {
  private token?: z.infer<typeof tokenSchema>;
  private identity?: z.infer<typeof identitySchema>;
  private eventsub?: EventSubClient;
  private timer?: ReturnType<typeof setTimeout>;
  private epoch = 0;
  private refreshing?: Promise<void>;
  private lastStatusAt = 0;
  constructor(
    readonly config: TwitchConfig,
    private controller: Controller,
    private request: typeof fetch = fetch,
    private sockets?: SocketFactory,
  ) {
    this.status(
      'Authentication required',
      this.configured
        ? 'Unlock controls and connect your own Twitch channel.'
        : 'Set TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET and TWITCH_REDIRECT_URI on the server.',
    );
  }
  get configured() {
    return !!(this.config.clientId && this.config.clientSecret && this.config.redirectUri);
  }
  private status(state: typeof this.controller.state.twitch.state, message: string) {
    this.controller.state.twitch = {
      ...this.controller.state.twitch,
      state,
      eventSub:
        state === 'Connected to Twitch'
          ? 'Subscribed'
          : state === 'Reconnecting'
            ? 'Reconnecting'
            : 'Disconnected',
      message,
      channel: this.identity?.login ?? null,
    };
    this.controller.emit('connection:status');
  }
  private async fetch(url: string, init: RequestInit = {}) {
    return this.request(url, { ...init, signal: AbortSignal.timeout(8000) });
  }
  async connect(code: string) {
    this.disconnect();
    const epoch = this.epoch;
    try {
      const response = await this.fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.config.redirectUri,
        }),
      });
      if (!response.ok)
        throw new Error(
          'OAuth exchange failed. Check the registered redirect URI and client credentials.',
        );
      const token = tokenSchema.parse(await response.json());
      if (epoch !== this.epoch) return;
      this.token = token;
      await this.validate(epoch);
      if (epoch !== this.epoch || !this.identity) return;
      this.eventsub = new EventSubClient(
        this.identity.user_id,
        (id) => this.subscribe(id),
        (m) => {
          this.controller.state.twitch.lastMessageAt = Date.now();
          this.controller.ingest(m);
          if (Date.now() - this.lastStatusAt > 5000) {
            this.lastStatusAt = Date.now();
            this.controller.emit('connection:status');
          }
        },
        (state, message) => this.status(state, message),
        () => this.fail('Twitch authorization was revoked. Reconnect your channel.'),
        this.sockets,
      );
      this.status('Reconnecting', 'Authorization validated. Opening EventSub.');
      this.eventsub.start();
      this.schedule(epoch);
    } catch (error) {
      if (epoch === this.epoch)
        this.fail(
          error instanceof Error && error.message.startsWith('OAuth exchange')
            ? error.message
            : 'Twitch authorization failed: check scope, token validity and network, then reconnect.',
        );
      throw new Error('Twitch connection failed');
    }
  }
  private async validate(epoch: number) {
    if (epoch !== this.epoch) return;
    if (!this.token) throw new Error('Authentication required');
    const response = await this.fetch('https://id.twitch.tv/oauth2/validate', {
      headers: { Authorization: `OAuth ${this.token.access_token}` },
    });
    if (!response.ok) throw new Error('Token validation failed');
    const identity = identitySchema.parse(await response.json());
    if (epoch !== this.epoch) return;
    if (
      identity.client_id !== this.config.clientId ||
      !identity.scopes.includes('user:read:chat') ||
      (this.identity && this.identity.user_id !== identity.user_id)
    )
      throw new Error('Missing scope or identity mismatch');
    if (epoch === this.epoch) {
      this.identity = identity;
      if (this.token) this.token.expires_in = identity.expires_in;
    }
  }
  private async refresh(epoch: number) {
    if (epoch !== this.epoch) return;
    if (this.refreshing) return this.refreshing;
    const previous = this.token;
    if (!previous) throw new Error('No refresh token');
    const pending = (async () => {
      const response = await this.fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: previous.refresh_token,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }),
      });
      if (!response.ok) throw new Error('Refresh failed');
      const token = tokenSchema.parse(await response.json());
      if (epoch !== this.epoch) return;
      this.token = token;
      await this.validate(epoch);
    })();
    this.refreshing = pending;
    try {
      await pending;
    } finally {
      if (this.refreshing === pending) this.refreshing = undefined;
    }
  }
  private schedule(epoch: number) {
    clearTimeout(this.timer);
    const delay = Math.min(
      3600000,
      Math.max(1000, ((this.token?.expires_in ?? 3600) - 120) * 1000),
    );
    this.timer = setTimeout(() => {
      void (async () => {
        if (epoch !== this.epoch) return;
        if ((this.token?.expires_in ?? 0) <= 3720) await this.refresh(epoch);
        else await this.validate(epoch);
        if (epoch === this.epoch) this.schedule(epoch);
      })().catch(() => {
        if (epoch === this.epoch)
          this.fail('Token refresh or hourly validation failed. Reconnect Twitch.');
      });
    }, delay);
  }
  private async subscribe(sessionId: string) {
    const epoch = this.epoch;
    if (!this.identity || !this.token) throw new Error('No authorization');
    const send = () =>
      this.fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token!.access_token}`,
          'Client-Id': this.config.clientId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'channel.chat.message',
          version: '1',
          condition: {
            broadcaster_user_id: this.identity!.user_id,
            user_id: this.identity!.user_id,
          },
          transport: { method: 'websocket', session_id: sessionId },
        }),
      });
    let response = await send();
    if (epoch !== this.epoch) return;
    if (response.status === 401) {
      await this.refresh(epoch);
      if (epoch !== this.epoch) return;
      response = await send();
    }
    if (epoch !== this.epoch) return;
    if (response.status === 401 || response.status === 403) {
      this.fail('Chat authorization rejected. Reconnect with user:read:chat.');
      throw new Error('Subscription denied');
    }
    if (!response.ok) throw new Error('Subscription unavailable');
    z.object({ data: z.array(z.object({ status: z.literal('enabled') })).min(1) }).parse(
      await response.json(),
    );
  }
  fail(message: string) {
    this.disconnect();
    this.status('Authentication required', message);
  }
  disconnect() {
    this.epoch++;
    clearTimeout(this.timer);
    this.eventsub?.stop();
    this.eventsub = undefined;
    this.token = undefined;
    this.refreshing = undefined;
    this.identity = undefined;
    this.controller.state.twitch.lastMessageAt = null;
    this.status('Disconnected', 'Twitch disconnected.');
  }
}
