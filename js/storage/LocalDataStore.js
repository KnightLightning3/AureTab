import { DataStore, createDefaultData, DEFAULT_PREFS } from './DataStore.js';
import { withWriteLock } from './writeLock.js';
import { validateData, validatePrefs } from '../io/schema.js';
export class LocalDataStore extends DataStore {
  async load({ locked = false } = {}) {
    const { appData } = await chrome.storage.local.get('appData');
    if (appData) return validateData(appData);
    const initialize = async () => {
      // A second new tab may have initialized storage while we waited.
      const { appData: current } = await chrome.storage.local.get('appData');
      if (current) return validateData(current);
      const data = validateData(createDefaultData());
      await this.save(data); return data;
    };
    return locked ? initialize() : withWriteLock(initialize);
  }
  // Writers must hold withWriteLock (including initialization).
  async save(data) { await this.saveSnapshot(data); }
  async saveSnapshot(data, prefs, extra = {}) {
    await chrome.storage.local.set({
      ...extra, appData: validateData(data), assetsChangedAt: Date.now(),
      ...(prefs ? { devicePrefs: validatePrefs(prefs) } : {}),
    });
  }
  onExternalChange(callback) {
    const listener = (changes, area) => {
      if (area !== 'local' || !changes.appData) return;
      if (changes.appData.newValue === undefined) {
        // Storage was cleared: reload defaults instead of showing stale data.
        this.load().then(callback).catch(console.error);
        return;
      }
      try { callback(validateData(changes.appData.newValue)); } catch (error) { console.error(error); }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }
}
export async function loadPrefs() { const { devicePrefs } = await chrome.storage.local.get('devicePrefs'); return validatePrefs({ ...DEFAULT_PREFS, ...devicePrefs }); }
export async function savePrefs(prefs) { await chrome.storage.local.set({ devicePrefs: validatePrefs(prefs) }); }
