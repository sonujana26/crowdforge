import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../apps/server/src/app';
describe('health', () => {
  it('exposes basic health only', async () => {
    const response = await request(createApp()).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', app: 'CrowdForge' });
  });
});
