import express from 'express';

export const unityArenaPolicy = express.Router();
unityArenaPolicy.use((req, res, next) => {
  if (req.path === '/arena' && req.query.renderer === 'unity')
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
    );
  next();
});
