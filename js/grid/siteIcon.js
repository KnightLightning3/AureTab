const LOCAL_ICON_NAME = /^[a-z0-9][a-z0-9.-]*\.(?:png|jpe?g|webp|ico)$/i;

export function isLocalIconFile(value) {
  return typeof value === 'string' && value.length <= 120 && !value.includes('..') && LOCAL_ICON_NAME.test(value);
}

export function localIconURL(value) {
  if (!isLocalIconFile(value)) return null;
  try {
    return chrome.runtime.getURL(`assets/site-icons/${value}`);
  } catch {
    return null;
  }
}
