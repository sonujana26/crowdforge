import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { Server } from 'socket.io';
import { z } from 'zod';
import { demoSchema, healthSchema, settingsSchema, telemetrySchema } from '@crowdforge/shared';
import { readConfig, type Config } from './config.js';
import { csrfToken, requireCreator, sameSecret } from './auth/session.js';
import { Controller, type Director } from './game/controller.js';
import { TwitchConnection } from './twitch/connection.js';
import { mountTwitch } from './routes/twitch.js';
import { createDirector } from './ai/director.js';
import { SessionStore } from './auth/store.js';
import { unityArenaPolicy } from './routes/unity.js';
export function createService(config: Config = readConfig(), director?: Director) {
  const app = express();
  const http = createServer(app);
  const origins = new Set([new URL(config.baseUrl).origin, new URL(config.clientOrigin).origin]);
  const io = new Server(http, {
    maxHttpBufferSize: 8192,
    allowRequest: (req, done) => done(null, !req.headers.origin || origins.has(req.headers.origin)),
  });
  const controller = new Controller(
    (state, event) => {
      io.emit('state:snapshot', state);
      if (event !== 'state:snapshot') io.emit(event, state);
    },
    director ?? createDirector(),
    (feedback) => io.emit('contribution:rejected', feedback),
  );
  controller.state.aiConfigured = !!(
    (process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL) ||
    process.env.GROQ_API_KEY
  );
  const twitch = new TwitchConnection(
    {
      clientId: process.env.TWITCH_CLIENT_ID || '',
      clientSecret: process.env.TWITCH_CLIENT_SECRET || '',
      redirectUri: process.env.TWITCH_REDIRECT_URI || '',
    },
    controller,
  );
  const sessionStore = new SessionStore();
  const sessions = session({
    store: sessionStore,
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: 'crowdforge.sid',
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.production,
      maxAge: 8 * 60 * 60 * 1000,
    },
  });
  if (config.production) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: config.production ? undefined : false }));
  app.use(unityArenaPolicy);
  app.use(express.json({ limit: '8kb' }));
  app.use(sessions);
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(
    '/api',
    rateLimit({ windowMs: 60000, limit: 240, standardHeaders: 'draft-8', legacyHeaders: false }),
  );
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (
        !origins.has(req.get('origin') || '') ||
        !req.session.csrf ||
        req.get('x-csrf-token') !== req.session.csrf
      ) {
        res.status(403).json({
          code: 'CSRF',
          message: 'Refresh this page and retry from the configured app origin.',
        });
        return;
      }
    }
    next();
  });
  app.get('/health', (_req, res) =>
    res.json(healthSchema.parse({ status: 'ok', app: 'CrowdForge' })),
  );
  app.get('/api/session', (req, res) => {
    req.session.csrf ??= csrfToken();
    res.json({
      creator: !!req.session.creator,
      csrf: req.session.csrf,
      passwordConfigured: !!config.creatorPassword,
    });
  });
  app.post('/api/session/login', rateLimit({ windowMs: 60000, limit: 10 }), (req, res, next) => {
    const input = z.object({ password: z.string().max(256) }).safeParse(req.body);
    if (
      !config.creatorPassword ||
      !input.success ||
      !sameSecret(input.data.password, config.creatorPassword)
    ) {
      res.status(401).json({
        code: 'LOGIN_FAILED',
        message: 'Set CREATOR_PASSWORD in server .env, then enter it here.',
      });
      return;
    }
    req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.creator = true;
      req.session.csrf = csrfToken();
      res.json({ creator: true, csrf: req.session.csrf });
    });
  });
  app.post('/api/session/logout', requireCreator, (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });
  app.get('/api/public-config', (_req, res) =>
    res.json({
      app: 'CrowdForge',
      aiConfigured: controller.state.aiConfigured,
      demoAllowed: config.demoAllowed,
    }),
  );
  app.get('/api/game/state', (_req, res) => res.json(controller.snapshot()));
  app.get('/api/twitch/status', (_req, res) => res.json(controller.state.twitch));
  mountTwitch(app, twitch);
  for (const action of ['start', 'pause', 'resume', 'stop', 'reset', 'advance'] as const)
    app.post(`/api/game/${action}`, requireCreator, (_req, res) => {
      if (action === 'reset') controller.stop(true);
      else if (action === 'advance') {
        if (controller.state.phase !== 'CONTRIBUTION')
          throw new Error('Only contributions can be ended early.');
        controller.advance();
      } else controller[action]();
      res.json({ ok: true });
    });
  app.post('/api/settings', requireCreator, (req, res) => {
    controller.configure(settingsSchema.parse(req.body));
    res.json({ ok: true });
  });
  app.post('/api/demo/mode', requireCreator, (req, res) => {
    const { enabled } = z.object({ enabled: z.boolean() }).strict().parse(req.body);
    if (enabled && !config.demoAllowed) {
      res
        .status(403)
        .json({ code: 'DEMO_DISABLED', message: 'Demo mode is disabled by the server.' });
      return;
    }
    controller.mode(enabled);
    res.json({ ok: true });
  });
  app.post('/api/demo/inject', requireCreator, (req, res) => {
    if (!config.demoAllowed || !controller.state.demoMode) {
      res.status(403).json({ code: 'DEMO_DISABLED', message: 'Enable DEMO MODE while idle.' });
      return;
    }
    const input = demoSchema.parse(req.body);
    res.json(
      controller.ingest({
        messageId: randomUUID(),
        broadcasterId: 'demo',
        userId: `demo-${input.viewer}`,
        displayName: `DemoViewer${input.viewer}`,
        text: input.text,
        receivedAt: Date.now(),
        source: 'demo',
      }),
    );
  });
  app.post('/api/game/telemetry', requireCreator, (req, res) => {
    const input = telemetrySchema.parse(req.body);
    controller.telemetry(input.roundId, input.health, input.enemies);
    res.json({ ok: true });
  });
  io.on('connection', (socket) => {
    socket.emit('state:snapshot', controller.snapshot());
    let last = 0;
    socket.on('client:ready', () => {
      if (Date.now() - last < 1000) return;
      last = Date.now();
      socket.emit('state:snapshot', controller.snapshot());
    });
  });
  const client = resolve(import.meta.dirname, '../../web/dist');
  app.use(express.static(client));
  app.get(['/', '/dashboard', '/arena', '/overlay'], (_req, res) =>
    res.sendFile(resolve(client, 'index.html')),
  );
  app.use(
    (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const requestId = randomUUID();
      const validation = error instanceof z.ZodError;
      res.status(validation ? 400 : 409).json({
        code: validation ? 'INVALID_INPUT' : 'ACTION_REJECTED',
        message: validation
          ? 'Input is outside the allowed bounds.'
          : 'Action unavailable in the current state. Check phase and configuration.',
        requestId,
      });
    },
  );
  return {
    app,
    http,
    io,
    controller,
    twitch,
    close: async () => {
      twitch.disconnect();
      controller.dispose();
      sessionStore.clear();
      await new Promise<void>((resolve) => io.close(() => resolve()));
    },
  };
}
export function createApp() {
  return createService().app;
}
