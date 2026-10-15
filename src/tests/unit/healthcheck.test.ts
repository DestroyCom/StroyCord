import { existsSync, rmSync, statSync } from 'node:fs';
import type { Client } from 'discord.js';
import { Status } from 'discord.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

const loadModule = async () => {
  vi.resetModules();
  return import('src/core/healthcheck');
};

const fakeClient = (ready: boolean, status: Status) => ({ isReady: () => ready, ws: { status } }) as unknown as Client;

describe('startHealthHeartbeat', () => {
  afterEach(async () => {
    const { HEALTH_FILE } = await import('src/core/healthcheck');
    rmSync(HEALTH_FILE, { force: true });
  });

  it('writes the heartbeat file while connected to Discord', async () => {
    const { HEALTH_FILE, startHealthHeartbeat } = await loadModule();
    rmSync(HEALTH_FILE, { force: true });

    startHealthHeartbeat(fakeClient(true, Status.Ready));

    expect(existsSync(HEALTH_FILE)).toBe(true);
    expect(Date.now() - statSync(HEALTH_FILE).mtimeMs).toBeLessThan(5_000);
  });

  it('does not write it while the gateway is disconnected', async () => {
    const { HEALTH_FILE, startHealthHeartbeat } = await loadModule();
    rmSync(HEALTH_FILE, { force: true });

    startHealthHeartbeat(fakeClient(true, Status.Reconnecting));

    expect(existsSync(HEALTH_FILE)).toBe(false);
  });
});
