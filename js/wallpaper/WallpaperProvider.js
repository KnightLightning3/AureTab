export class WallpaperProvider {
  /** @type {'local'|'bing'} */ id;
  /** @returns {Promise<Blob|null>} */ async getCurrent() { return null; }
  async refresh() {}
}
