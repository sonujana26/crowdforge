import type { Express } from 'express';
import { requireCreator, csrfToken, sameSecret } from '../auth/session.js';
import { TwitchConnection } from '../twitch/connection.js';
export function mountTwitch(app: Express, twitch: TwitchConnection, dashboard = '/dashboard') {
  const issuedStates = new Map<string, number>();
  app.get('/auth/twitch', requireCreator, (req, res) => {
    if (req.get('sec-fetch-site') === 'cross-site') {
      res.status(403).send('Open Connect Twitch from the dashboard.');
      return;
    }
    if (!twitch.configured) {
      res
        .status(503)
        .send(
          'Set Twitch credentials and exact redirect URI on the server. See docs/TWITCH_SETUP.md.',
        );
      return;
    }
    req.session.oauthState = csrfToken();
    req.session.oauthAt = Date.now();
    for (const [key, at] of issuedStates) if (Date.now() - at > 600000) issuedStates.delete(key);
    if (issuedStates.size >= 1000) issuedStates.delete(issuedStates.keys().next().value!);
    issuedStates.set(req.session.oauthState, req.session.oauthAt);
    const url = new URL('https://id.twitch.tv/oauth2/authorize');
    url.search = new URLSearchParams({
      response_type: 'code',
      client_id: twitch.config.clientId,
      redirect_uri: twitch.config.redirectUri,
      scope: 'user:read:chat',
      state: req.session.oauthState,
      force_verify: 'true',
    }).toString();
    req.session.save((error) => {
      if (error) res.status(503).send('Unable to start OAuth session. Retry.');
      else res.redirect(url.toString());
    });
  });
  app.get('/auth/twitch/callback', requireCreator, async (req, res) => {
    const expected = req.session.oauthState;
    const started = req.session.oauthAt;
    delete req.session.oauthState;
    delete req.session.oauthAt;
    const state = req.query.state;
    if (
      !expected ||
      !started ||
      Date.now() - started > 600000 ||
      typeof state !== 'string' ||
      state.length > 200 ||
      !sameSecret(state, expected) ||
      !issuedStates.has(state)
    ) {
      res.status(400).send('OAuth state mismatch or expired. Start Connect Twitch again.');
      return;
    }
    issuedStates.delete(state);
    await new Promise<void>((resolve, reject) =>
      req.session.save((error) => (error ? reject(error) : resolve())),
    );
    if (req.query.error) {
      twitch.fail('Twitch authorization declined. Try Connect Twitch again when ready.');
      res.redirect(dashboard);
      return;
    }
    const code = req.query.code;
    if (typeof code !== 'string' || code.length > 1000) {
      res.status(400).send('Missing OAuth code. Reconnect Twitch.');
      return;
    }
    try {
      await twitch.connect(code);
    } catch {}
    res.redirect(dashboard);
  });
  app.post('/api/twitch/disconnect', requireCreator, (req, res) => {
    twitch.disconnect();
    if (req.session.oauthState) issuedStates.delete(req.session.oauthState);
    delete req.session.oauthState;
    delete req.session.oauthAt;
    res.json({ ok: true });
  });
}
