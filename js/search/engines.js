export const engines = {
  google: { name: 'Google', icon: 'assets/icons/google.svg', search: 'https://www.google.com/search?q=', images: 'https://www.google.com/imghp?hl=zh-CN' },
  bing: { name: 'Bing', icon: 'assets/icons/bing.svg', search: 'https://www.bing.com/search?q=', images: 'https://www.bing.com/images' },
  sogou: { name: '搜狗', icon: 'assets/icons/sogou.svg', search: 'https://www.sogou.com/web?query=', images: 'https://pic.sogou.com/' },
};
export function searchURL(engine, query) { return engines[engine].search + encodeURIComponent(query.trim()); }
