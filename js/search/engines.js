export const engines = {
  google: { name: 'Google', icon: 'assets/icons/google.svg', search: 'https://www.google.com/search?q=', images: 'https://www.google.com/imghp?hl=zh-CN' },
  bing: { name: 'Bing', icon: 'assets/icons/bing.svg', search: 'https://www.bing.com/search?q=', images: 'https://www.bing.com/images' },
  sogou: { name: '搜狗', icon: 'assets/icons/sogou.svg', search: 'https://www.sogou.com/web?query=', images: 'https://pic.sogou.com/' },
};
/** encodeURIComponent throws on unpaired surrogates; replace them first. */
function encodeQuery(query) {
  let text = query.trim();
  if (typeof text.toWellFormed === 'function') text = text.toWellFormed();
  else text = text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '�');
  return encodeURIComponent(text);
}
export function searchURL(engine, query) {
  if (!Object.hasOwn(engines, engine)) throw new Error('未知搜索引擎');
  return engines[engine].search + encodeQuery(query);
}
