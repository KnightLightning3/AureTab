import { WallpaperProvider } from './WallpaperProvider.js';
/** Reserved: no network, host_permissions or alarms until Bing integration is implemented. */
export class BingWallpaperProvider extends WallpaperProvider { id = 'bing'; async getCurrent() { return null; } }
