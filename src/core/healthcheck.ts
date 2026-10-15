import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type Client, Status } from 'discord.js';

// Read by the Docker HEALTHCHECK: the container is healthy while this file keeps being refreshed
export const HEALTH_FILE = join(tmpdir(), 'stroycord-healthy');
const HEARTBEAT_MS = 30_000;

let started = false;

/** Refreshes HEALTH_FILE every 30 s while the gateway connection to Discord is up. */
export const startHealthHeartbeat = (client: Client) => {
  if (started) return;
  started = true;
  const beat = () => {
    if (!client.isReady() || client.ws.status !== Status.Ready) return;
    try {
      writeFileSync(HEALTH_FILE, String(Date.now()));
    } catch (e) {
      console.error('[healthcheck] failed to write heartbeat:', e);
    }
  };
  beat();
  setInterval(beat, HEARTBEAT_MS).unref();
};
