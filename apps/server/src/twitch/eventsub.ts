import { z } from 'zod';
import type { NormalizedChatMessage } from '@crowdforge/shared';
const endpoint = 'wss://eventsub.wss.twitch.tv/ws';
export interface SocketLike {
  addEventListener(type: string, callback: (event: { data?: unknown }) => void): void;
  close(): void;
}
export type SocketFactory = (url: string) => SocketLike;
const envelope = z.object({
  metadata: z.object({
    message_id: z.string().max(200),
    message_type: z.string().max(80),
    message_timestamp: z.string().max(80).optional(),
  }),
  payload: z.record(z.string(), z.unknown()),
});
const welcome = z.object({
  session: z.object({
    id: z.string().min(1).max(500),
    keepalive_timeout_seconds: z.number().min(1).max(600).nullable().optional(),
    reconnect_url: z.string().nullable().optional(),
  }),
});
const notification = z.object({
  subscription: z.object({
    type: z.literal('channel.chat.message'),
    condition: z.object({ broadcaster_user_id: z.string(), user_id: z.string() }),
  }),
  event: z.object({
    broadcaster_user_id: z.string().max(100),
    chatter_user_id: z.string().min(1).max(100),
    chatter_user_name: z.string().max(100),
    message_id: z.string().min(1).max(200),
    message: z.object({ text: z.string().max(500) }),
    source_broadcaster_user_id: z.string().nullable().optional(),
  }),
});
export function validReconnectUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'wss:' &&
      url.hostname === 'eventsub.wss.twitch.tv' &&
      !url.username &&
      !url.password &&
      !url.port
    );
  } catch {
    return false;
  }
}
export class EventSubClient {
  private sockets = new Set<SocketLike>();
  private active?: SocketLike;
  private retry?: ReturnType<typeof setTimeout>;
  private watchdog = new Map<SocketLike, ReturnType<typeof setTimeout>>();
  private seen = new Set<string>();
  private stopped = true;
  private attempts = 0;
  constructor(
    private userId: string,
    private subscribe: (sessionId: string) => Promise<void>,
    private receive: (message: NormalizedChatMessage) => void,
    private status: (
      state: 'Connected to Twitch' | 'Reconnecting' | 'Authentication required',
      message: string,
    ) => void,
    private revoked: () => void,
    private factory: SocketFactory = (url) => new WebSocket(url),
  ) {}
  start() {
    this.stop();
    this.stopped = false;
    this.open(endpoint, false);
  }
  private arm(socket: SocketLike, seconds: number) {
    clearTimeout(this.watchdog.get(socket));
    this.watchdog.set(
      socket,
      setTimeout(() => this.lost(socket), (seconds + 2) * 1000),
    );
  }
  private forget(socket: SocketLike) {
    clearTimeout(this.watchdog.get(socket));
    this.watchdog.delete(socket);
    this.sockets.delete(socket);
    if (this.active === socket) this.active = undefined;
  }
  private open(url: string, migrated: boolean) {
    if (this.stopped) return;
    const socket = this.factory(url);
    this.sockets.add(socket);
    this.arm(socket, 10);
    let timeout = 10;
    let welcomed = false;
    socket.addEventListener('message', (event) => {
      void (async () => {
        if (
          this.stopped ||
          !this.sockets.has(socket) ||
          typeof event.data !== 'string' ||
          event.data.length > 65536
        )
          return;
        let raw: unknown;
        try {
          raw = JSON.parse(event.data);
        } catch {
          return;
        }
        const parsed = envelope.safeParse(raw);
        if (!parsed.success) return;
        const { metadata, payload } = parsed.data;
        if (metadata.message_type === 'session_welcome') {
          if (welcomed) return;
          welcomed = true;
          const session = welcome.parse(payload).session;
          timeout = session.keepalive_timeout_seconds ?? 10;
          this.arm(socket, timeout);
          if (!migrated) await this.subscribe(session.id);
          if (this.stopped || !this.sockets.has(socket)) return;
          const old = this.active;
          this.active = socket;
          this.attempts = 0;
          if (old && old !== socket) {
            this.forget(old);
            old.close();
          }
          this.status('Connected to Twitch', 'Chat subscription active.');
          return;
        }
        if (!welcomed) return;
        if (metadata.message_type === 'session_keepalive') {
          this.arm(socket, timeout);
          return;
        }
        if (metadata.message_type === 'session_reconnect') {
          const url = welcome.parse(payload).session.reconnect_url;
          if (!url || !validReconnectUrl(url)) throw new Error('Invalid reconnect destination');
          if (this.sockets.size < 2) {
            this.status('Reconnecting', 'Twitch requested a connection migration.');
            this.open(url, true);
          }
          return;
        }
        if (metadata.message_type === 'revocation') {
          this.stop();
          this.revoked();
          return;
        }
        if (metadata.message_type !== 'notification') return;
        this.arm(socket, timeout);
        if (this.seen.has(metadata.message_id)) return;
        const parsedEvent = notification.safeParse(payload);
        if (!parsedEvent.success) return;
        const { subscription, event: chat } = parsedEvent.data;
        if (
          subscription.condition.broadcaster_user_id !== this.userId ||
          subscription.condition.user_id !== this.userId ||
          chat.broadcaster_user_id !== this.userId
        )
          return;
        if (chat.source_broadcaster_user_id && chat.source_broadcaster_user_id !== this.userId)
          return;
        if (
          metadata.message_timestamp &&
          Math.abs(Date.now() - Date.parse(metadata.message_timestamp)) > 600000
        )
          return;
        this.seen.add(metadata.message_id);
        if (this.seen.size > 2000) this.seen.delete(this.seen.values().next().value!);
        this.receive({
          messageId: chat.message_id,
          broadcasterId: chat.broadcaster_user_id,
          userId: chat.chatter_user_id,
          displayName: chat.chatter_user_name,
          text: chat.message.text,
          receivedAt: Date.now(),
          source: 'twitch',
        });
      })().catch(() => {
        if (!this.stopped && this.sockets.has(socket)) this.lost(socket);
      });
    });
    socket.addEventListener('close', () => this.lost(socket));
    socket.addEventListener('error', () => this.lost(socket));
  }
  private lost(socket: SocketLike) {
    if (!this.sockets.has(socket)) return;
    const wasActive = this.active === socket;
    this.forget(socket);
    socket.close();
    if (this.stopped) return;
    if (this.active && !wasActive) return;
    if (this.sockets.size) return;
    this.status(
      'Reconnecting',
      'Chat interrupted. Reconnecting; missed messages cannot be replayed.',
    );
    if (this.retry) return;
    this.retry = setTimeout(
      () => {
        this.retry = undefined;
        this.open(endpoint, false);
      },
      Math.min(30000, 1000 * 2 ** Math.min(this.attempts++, 5)),
    );
  }
  stop() {
    this.stopped = true;
    clearTimeout(this.retry);
    this.retry = undefined;
    for (const socket of [...this.sockets]) {
      this.forget(socket);
      socket.close();
    }
    this.seen.clear();
  }
}
