import type { IPlatformClient } from '../../application/ports/IPlatformClient';
import { MetaPlatformClient } from './MetaPlatformClient';
import { GooglePlatformClient } from './GooglePlatformClient';
import { TikTokPlatformClient } from './TikTokPlatformClient';
import { SnapPlatformClient } from './SnapPlatformClient';

export class PlatformClientFactory {
  private clients: Map<string, IPlatformClient> = new Map();

  constructor() {
    const meta = new MetaPlatformClient();
    const google = new GooglePlatformClient();
    const tiktok = new TikTokPlatformClient();
    const snap = new SnapPlatformClient();

    this.clients.set('meta', meta);
    this.clients.set('google', google);
    this.clients.set('tiktok', tiktok);
    this.clients.set('snap', snap);
  }

  getClient(platform: string): IPlatformClient | null {
    return this.clients.get(platform) ?? null;
  }

  getClientOrThrow(platform: string): IPlatformClient {
    const client = this.getClient(platform);
    if (!client) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    return client;
  }

  getSupportedPlatforms(): string[] {
    return Array.from(this.clients.keys());
  }
}
