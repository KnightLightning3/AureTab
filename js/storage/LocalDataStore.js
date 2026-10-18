import { DataStore, createDefaultData, DEFAULT_PREFS } from './DataStore.js';
import { validateData, validatePrefs } from '../io/schema.js';
export class LocalDataStore extends DataStore {
  async load() {
    const { appData } = await chrome.storage.local.get('appData');
    if (appData) return validateData(appData);
    const data = validateData(createDefaultData()); await this.save(data); return data;
  }
  async save(data) { await chrome.storage.local.set({ appData: validateData(data) }); }
  onExternalChange(callback) {
    const listener = (changes, area) => {
      if (area === 'local' && changes.appData?.newValue) {
        try { callback(validateData(changes.appData.newValue)); } catch (error) { console.error(error); }
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }
}
export async function loadPrefs() { const { devicePrefs } = await chrome.storage.local.get('devicePrefs'); return validatePrefs({ ...DEFAULT_PREFS, ...devicePrefs }); }
export async function savePrefs(prefs) { await chrome.storage.local.set({ devicePrefs: validatePrefs(prefs) }); }
