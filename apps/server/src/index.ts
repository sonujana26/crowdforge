import { createService } from './app.js';
import { readConfig } from './config.js';
const config = readConfig();
const service = createService(config);
service.http.listen(config.port, () =>
  console.info(
    `CrowdForge listening on port ${config.port}. Creator password ${config.creatorPassword ? 'configured' : 'missing; set CREATOR_PASSWORD in .env'}.`,
  ),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    void service.close();
  });
