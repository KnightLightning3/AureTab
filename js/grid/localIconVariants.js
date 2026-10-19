import { resolveLocalIconFile, isMonoIconFile } from './siteIcon.js';

let indexPromise, sitesPromise;
const readJSON = async path => {
  const response = await fetch(new URL(path, import.meta.url));
  if (!response.ok) throw new Error('本地图标索引加载失败');
  return response.json();
};
function loadIndex() {
  return indexPromise ??= readJSON('../../data/icon-variants.json').catch(error => { indexPromise = null; throw error; });
}
function loadSites() {
  return sitesPromise ??= readJSON('../../data/sites.json').catch(error => { sitesPromise = null; throw error; });
}
const normalize = value => value.toLowerCase().replace(/[^a-z0-9]/g, '');
export function iconHost(value) {
  try {
    const raw = String(value ?? '').trim();
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    return ['http:', 'https:'].includes(url.protocol) ? url.hostname.toLowerCase().replace(/^www\./, '') : '';
  } catch { return ''; }
}

/** Called only by the editor; never requests remote artwork or affects first paint. */
export async function findLocalIconVariants(url) {
  const host = iconHost(url);
  if (!host) return [];
  const [index, catalog] = await Promise.all([loadIndex(), loadSites()]);
  const known = catalog.sites.filter(site => host === site.domain || host.endsWith(`.${site.domain}`))
    .sort((a, b) => b.domain.length - a.domain.length)[0];
  const domain = known?.domain || Object.keys(index.domains).filter(domain => host === domain || host.endsWith(`.${domain}`))
    .sort((a, b) => b.length - a.length)[0];
  const keys = domain ? index.domains[domain] ?? [] : [];
  // Unknown domains may still have an exact brand slug in the downloaded collections.
  // Exclude generic service subdomains, so mail.google.com resolves to Gmail above.
  const inferred = !domain ? host.split('.').slice(0, -1).reverse().filter(part => !['com', 'co', 'org', 'net', 'www', 'mail', 'chat', 'app'].includes(part)).map(normalize) : [];
  const found = [...new Set([...keys, ...inferred])].flatMap(key => index.brands[key] ?? []);
  const result = [], seen = new Set();
  const add = (value, label) => {
    const file = resolveLocalIconFile(value);
    if (!file || seen.has(file)) return;
    result.push({ file, label, mono: isMonoIconFile(file) });
    seen.add(file);
  };
  for (const item of found) add(item.file, item.label);
  // Saved selections are normalized by resolveLocalIconFile at render/save time.
  // They never add candidates: the URL alone determines the curated collection.
  return result;
}
