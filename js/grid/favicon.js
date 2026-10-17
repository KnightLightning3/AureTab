export function faviconSources(siteUrl, style = 'color') {
  let google = null, ddg = null, chromeURL = null;
  try {
    const host = new URL(siteUrl).hostname;
    const googleURL = new URL('https://www.google.com/s2/favicons'); googleURL.searchParams.set('domain', host); googleURL.searchParams.set('sz', '128'); google = googleURL.href;
    ddg = `https://icons.duckduckgo.com/ip3/${host}.ico`;
  } catch {}
  try {
    const url = new URL(chrome.runtime.getURL('/_favicon/')); url.searchParams.set('pageUrl', siteUrl); url.searchParams.set('size', '128'); chromeURL = url.href;
  } catch {}
  return (style === 'glyph' ? [chromeURL, ddg, google] : [google, ddg, chromeURL]).filter(Boolean);
}
