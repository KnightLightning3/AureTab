/** @typedef {{id:string,title:string,url:string,size:'1x1'|'2x1'|'1x2'|'2x2',text:string,iconId?:string,iconFile?:string,iconWide?:string,iconStyle?:'color'|'glyph',iconBackground?:string,useText?:boolean}} Site */
/** @typedef {{id:string,name:string,sites:Site[]}} Group */
/** @typedef {{schemaVersion:1,revision:number,groups:Group[],settings:{blur:string,overlay:string,radius:string}}} AppData */
export class DataStore {
  /** @returns {Promise<AppData>} */
  async load() { throw new Error('DataStore.load must be implemented'); }
  /** @param {AppData} data */
  async save(data) { throw new Error('DataStore.save must be implemented'); }
  onExternalChange(_callback) { return () => {}; }
}
export const DEFAULT_PREFS = { engine: 'google', minimal: false, layout: 'golden', clock24: true, showDate: true, dateFormat: 'yyyy-mm-dd', showLabels: true, theme: 'glass', wallpaper: 'none' };
export const DEFAULT_SETTINGS = { blur: '0', overlay: '15', radius: '16' };
export function createDefaultData() {
  return { schemaVersion: 1, revision: 0, groups: [{ id: crypto.randomUUID(), name: '常用', sites: [] }], settings: { ...DEFAULT_SETTINGS } };
}
