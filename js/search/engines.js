export const engines = {
  google: { name: 'Google', mark: 'G', search: 'https://www.google.com/search?q=', images: 'https://lens.google/' },
  bing: { name: 'Bing', mark: 'B', search: 'https://www.bing.com/search?q=', images: 'https://www.bing.com/images' },
  sogou: { name: '搜狗', mark: '搜', search: 'https://www.sogou.com/web?query=', images: 'https://pic.sogou.com/' },
};
export function searchURL(engine, query) { return engines[engine].search + encodeURIComponent(query.trim()); }
