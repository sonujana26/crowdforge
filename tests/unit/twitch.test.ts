import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  EventSubClient,
  validReconnectUrl,
  type SocketLike,
} from '../../apps/server/src/twitch/eventsub';
import { TwitchConnection } from '../../apps/server/src/twitch/connection';
import { Controller } from '../../apps/server/src/game/controller';
class FakeSocket implements SocketLike {
  listeners = new Map<string, ((event: { data?: unknown }) => void)[]>();
  closed = false;
  addEventListener(type: string, callback: (event: { data?: unknown }) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) || []), callback]);
  }
  close() {
    this.closed = true;
  }
  send(type: string, payload: unknown = {}, id: string = crypto.randomUUID()) {
    for (const callback of this.listeners.get('message') || [])
      callback({
        data: JSON.stringify({ metadata: { message_type: type, message_id: id }, payload }),
      });
  }
  drop() {
    for (const callback of this.listeners.get('close') || []) callback({});
  }
}
const welcome = { session: { id: 'session', keepalive_timeout_seconds: 10, reconnect_url: null } };
const notification = {
  subscription: {
    type: 'channel.chat.message',
    condition: { broadcaster_user_id: '42', user_id: '42' },
  },
  event: {
    broadcaster_user_id: '42',
    chatter_user_id: 'viewer',
    chatter_user_name: 'Viewer',
    message_id: 'chat-id',
    message: { text: '!forge ice' },
  },
};
afterEach(() => vi.useRealTimers());
describe('EventSub protocol', () => {
  it('subscribes only on fresh welcome; deduplicates and filters channel events', async () => {
    vi.useFakeTimers();
    const sockets: FakeSocket[] = [];
    const subscribe = vi.fn(async () => {});
    const receive = vi.fn();
    const status = vi.fn();
    const revoked = vi.fn();
    const c = new EventSubClient('42', subscribe, receive, status, revoked, () => {
      const s = new FakeSocket();
      sockets.push(s);
      return s;
    });
    c.start();
    sockets[0]!.send('session_welcome', welcome);
    await Promise.resolve();
    expect(subscribe).toHaveBeenCalledWith('session');
    sockets[0]!.send('notification', notification, 'same');
    sockets[0]!.send('notification', notification, 'same');
    expect(receive).toHaveBeenCalledTimes(1);
    expect(receive.mock.calls[0]![0].source).toBe('twitch');
    sockets[0]!.send('notification', {
      ...notification,
      event: { ...notification.event, broadcaster_user_id: 'other' },
    });
    expect(receive).toHaveBeenCalledTimes(1);
    sockets[0]!.send('session_keepalive');
    await vi.advanceTimersByTimeAsync(11000);
    expect(sockets).toHaveLength(1);
    sockets[0]!.send('session_reconnect', {
      session: {
        ...welcome.session,
        reconnect_url: 'wss://eventsub.wss.twitch.tv/ws?reconnect=opaque',
      },
    });
    expect(sockets).toHaveLength(2);
    sockets[1]!.send('session_welcome', welcome);
    await Promise.resolve();
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(sockets[0]!.closed).toBe(true);
    sockets[1]!.send('revocation');
    expect(revoked).toHaveBeenCalledOnce();
    expect(sockets[1]!.closed).toBe(true);
    c.stop();
  });
  it('reconnects after closure and watchdog, resubscribes, and stops cleanly', async () => {
    vi.useFakeTimers();
    const sockets: FakeSocket[] = [];
    const subscribe = vi.fn(async () => {});
    const c = new EventSubClient(
      '42',
      subscribe,
      () => {},
      () => {},
      () => {},
      () => {
        const s = new FakeSocket();
        sockets.push(s);
        return s;
      },
    );
    c.start();
    sockets[0]!.send('session_welcome', welcome);
    await Promise.resolve();
    sockets[0]!.drop();
    await vi.advanceTimersByTimeAsync(1000);
    expect(sockets).toHaveLength(2);
    sockets[1]!.send('session_welcome', welcome);
    await Promise.resolve();
    expect(subscribe).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(13000);
    expect(sockets).toHaveLength(3);
    c.stop();
    await vi.advanceTimersByTimeAsync(60000);
    expect(sockets).toHaveLength(3);
  });
  it('never follows a foreign reconnect URL', () => {
    expect(validReconnectUrl('wss://eventsub.wss.twitch.tv/ws?x=1')).toBe(true);
    for (const url of [
      'wss://evil.example/ws',
      'https://eventsub.wss.twitch.tv/ws',
      'wss://eventsub.wss.twitch.tv.evil/ws',
      'wss://user@eventsub.wss.twitch.tv/ws',
    ])
      expect(validReconnectUrl(url)).toBe(false);
  });
});
describe('server-side Twitch tokens', () => {
  it('refreshes once after a subscription 401 and uses the refreshed token', async () => {
    vi.useFakeTimers();
    const socket = new FakeSocket();
    let exchanges = 0;
    const subscriptionTokens: string[] = [];
    const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).endsWith('/token')) {
        exchanges++;
        return Response.json({
          access_token: `private-${exchanges}`,
          refresh_token: 'refresh',
          expires_in: 4000,
        });
      }
      if (String(url).endsWith('/validate'))
        return Response.json({
          client_id: 'client',
          user_id: '42',
          login: 'creator',
          scopes: ['user:read:chat'],
          expires_in: 4000,
        });
      subscriptionTokens.push(new Headers(init?.headers).get('Authorization')!);
      return subscriptionTokens.length === 1
        ? Response.json({}, { status: 401 })
        : Response.json({ data: [{ status: 'enabled' }] }, { status: 202 });
    }) as unknown as typeof fetch;
    const controller = new Controller();
    const twitch = new TwitchConnection(
      { clientId: 'client', clientSecret: 'secret', redirectUri: 'http://localhost/callback' },
      controller,
      fetcher,
      () => socket,
    );
    try {
      await twitch.connect('code');
      socket.send('session_welcome', welcome);
      await vi.advanceTimersByTimeAsync(0);
      expect(subscriptionTokens).toEqual(['Bearer private-1', 'Bearer private-2']);
      expect(exchanges).toBe(2);
      expect(controller.state.twitch.state).toBe('Connected to Twitch');
      expect(JSON.stringify(controller.snapshot())).not.toContain('private-');
    } finally {
      twitch.disconnect();
      controller.dispose();
    }
  });
  it('ignores old token validation completing after a newer connection', async () => {
    let release!: (response: Response) => void;
    let started!: () => void;
    const validationStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    const oldValidation = new Promise<Response>((resolve) => {
      release = resolve;
    });
    let exchanges = 0;
    const identity = (id: string) => ({
      client_id: 'client',
      user_id: id,
      login: `creator${id}`,
      scopes: ['user:read:chat'],
      expires_in: 4000,
    });
    const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).endsWith('/token'))
        return Response.json({
          access_token: `private-${++exchanges}`,
          refresh_token: 'refresh',
          expires_in: 4000,
        });
      if (new Headers(init?.headers).get('Authorization') === 'OAuth private-1') {
        started();
        return oldValidation;
      }
      return Response.json(identity('2'));
    }) as unknown as typeof fetch;
    const controller = new Controller();
    const sockets = vi.fn(() => new FakeSocket());
    const twitch = new TwitchConnection(
      { clientId: 'client', clientSecret: 'secret', redirectUri: 'http://localhost/callback' },
      controller,
      fetcher,
      sockets,
    );
    try {
      const old = twitch.connect('old-code');
      await validationStarted;
      await twitch.connect('new-code');
      release(Response.json(identity('1')));
      await old;
      expect(controller.state.twitch.channel).toBe('creator2');
      expect(sockets).toHaveBeenCalledTimes(1);
    } finally {
      twitch.disconnect();
      controller.dispose();
    }
  });
  it('exchanges, validates identity, and creates a broadcaster-owned read-only subscription', async () => {
    vi.useFakeTimers();
    const sockets: FakeSocket[] = [];
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      if (String(url).endsWith('/token'))
        return Response.json({
          access_token: 'private-access',
          refresh_token: 'private-refresh',
          expires_in: 4000,
        });
      if (String(url).endsWith('/validate'))
        return Response.json({
          client_id: 'client',
          user_id: '42',
          login: 'creator',
          scopes: ['user:read:chat'],
          expires_in: 4000,
        });
      return Response.json({ data: [{ status: 'enabled' }] }, { status: 202 });
    }) as unknown as typeof fetch;
    const controller = new Controller();
    const twitch = new TwitchConnection(
      {
        clientId: 'client',
        clientSecret: 'private-secret',
        redirectUri: 'http://localhost/callback',
      },
      controller,
      fetcher,
      () => {
        const s = new FakeSocket();
        sockets.push(s);
        return s;
      },
    );
    await twitch.connect('one-time-code');
    sockets[0]!.send('session_welcome', welcome);
    await vi.advanceTimersByTimeAsync(0);
    const call = calls.find((c) => c.url.includes('/subscriptions'))!;
    expect(JSON.parse(String(call.init?.body)).condition).toEqual({
      broadcaster_user_id: '42',
      user_id: '42',
    });
    expect(controller.state.twitch.state).toBe('Connected to Twitch');
    expect(JSON.stringify(controller.snapshot())).not.toContain('private-');
    controller.start();
    twitch.disconnect();
    expect(controller.state.phase).toBe('CONTRIBUTION');
    expect(controller.state.twitch.state).toBe('Disconnected');
    expect(sockets[0]!.closed).toBe(true);
    controller.dispose();
  });
  it('fails closed on missing scope', async () => {
    const c = new Controller();
    const fetcher = vi.fn(async (url: string | URL | Request) =>
      String(url).endsWith('/token')
        ? Response.json({ access_token: 'secret', refresh_token: 'refresh', expires_in: 3600 })
        : Response.json({
            client_id: 'client',
            user_id: '42',
            login: 'creator',
            scopes: [],
            expires_in: 3600,
          }),
    ) as unknown as typeof fetch;
    const t = new TwitchConnection(
      { clientId: 'client', clientSecret: 'secret', redirectUri: 'http://localhost/callback' },
      c,
      fetcher,
    );
    await expect(t.connect('code')).rejects.toThrow();
    expect(c.state.twitch.state).toBe('Authentication required');
    expect(JSON.stringify(c.snapshot())).not.toContain('refresh_token');
    t.disconnect();
    c.dispose();
  });
});
