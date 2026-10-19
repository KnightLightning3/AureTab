const LOCAL_ICON_NAME = /^[a-z0-9][a-z0-9.-]*\.(?:png|jpe?g|webp|ico|svg)$/i;

/** Older catalog names whose downloaded favicon was replaced by a bundled SVG. */
export const LEGACY_ICON_FILES = Object.freeze({
  'google.com.png': 'google.com.svg',
  'bing.com.png': 'bing.com.svg',
  'baidu.com.png': 'baidu.com.svg',
  'bilibili.com.jpg': 'bilibili.com.svg',
  'github.com.png': 'github.com.svg',
  'huggingface.co.png': 'huggingface.co.svg',
  'vercel.com.png': 'vercel.com.svg',
  'cloudflare.com.png': 'cloudflare.com.svg',
  'figma.com.png': 'figma.com.svg',
  'notion.so.png': 'notion.so.svg',
  'claude.ai.png': 'claude.ai.svg',
  'gemini.google.com.png': 'gemini.google.com.svg',
  'midjourney.com.png': 'midjourney.com.svg',
  'perplexity.ai.png': 'perplexity.ai.svg',
  'microsoft.com.png': 'microsoft.com.svg',
  'apple.com.png': 'apple.com.svg',
  'huawei.com.png': 'huawei.com.svg',
  'tencent.com.png': 'tencent.com.svg',
  'chatglm.cn.png': 'chatglm.cn.svg',
  'yuanbao.tencent.com.png': 'yuanbao.tencent.com.svg',
  'mistral.ai.png': 'mistral.ai.svg',
  'cloud.tencent.com.png': 'cloud.tencent.com.svg',
  'yiyan.baidu.com.ico': 'yiyan.baidu.com.svg',
  'kimi.moonshot.cn.png': 'kimi.moonshot.cn.svg',
  'doubao.com.png': 'doubao.com.svg',
  'chatgpt.com.png': 'chatgpt.com.svg',
  'tongyi.aliyun.com.png': 'tongyi.aliyun.com.svg',
  'aliyun.com.png': 'aliyun.com.svg',
  'xinghuo.xfyun.cn.png': 'xinghuo.xfyun.cn.svg',
});

/** Wide-tile wordmarks. Kept explicit so older saved icons get them too. */
export const WIDE_ICON_FILES = Object.freeze({
  'bing.com.svg': 'bing.com-text.svg',
  'baidu.com.svg': 'baidu.com-text.svg',
  'bilibili.com.svg': 'bilibili.com-text.svg',
  'github.com.svg': 'github.com-text.svg',
  'huggingface.co.svg': 'huggingface.co-text.svg',
  'vercel.com.svg': 'vercel.com-text.svg',
  'cloudflare.com.svg': 'cloudflare.com-text.svg',
  'figma.com.svg': 'figma.com-text.svg',
  'notion.so.svg': 'notion.so-text.svg',
  'claude.ai.svg': 'claude.ai-text.svg',
  'gemini.google.com.svg': 'gemini.google.com-text.svg',
  'copilot.microsoft.com.svg': 'copilot.microsoft.com-text.svg',
  'midjourney.com.svg': 'midjourney.com-text.svg',
  'perplexity.ai.svg': 'perplexity.ai-text.svg',
  'microsoft.com.svg': 'microsoft.com-text.svg',
  'apple.com.svg': 'apple.com-text.svg',
  'huawei.com.svg': 'huawei.com-text.svg',
  'tencent.com.svg': 'tencent.com-text.svg',
  'chatglm.cn.svg': 'chatglm.cn-text.svg',
  'yuanbao.tencent.com.svg': 'yuanbao.tencent.com-text.svg',
  'mistral.ai.svg': 'mistral.ai-text.svg',
  'cloud.tencent.com.svg': 'cloud.tencent.com-text.svg',
  'yiyan.baidu.com.svg': 'yiyan.baidu.com-text.svg',
  'kimi.moonshot.cn.svg': 'kimi.moonshot.cn-text.svg',
  'doubao.com.svg': 'doubao.com-text.svg',
  'chatgpt.com.svg': 'chatgpt.com-text.svg',
  'tongyi.aliyun.com.svg': 'tongyi.aliyun.com-text.svg',
  'aliyun.com.svg': 'aliyun.com-text.svg',
  'xinghuo.xfyun.cn.svg': 'xinghuo.xfyun.cn-text.svg',
});

/** Monochrome lobe icons use currentColor, which resolves to black inside <img>. */
export const MONO_ICON_FILES = new Set([
  'github.com.svg', 'chatgpt.com.svg', 'vercel.com.svg', 'notion.so.svg', 'midjourney.com.svg', 'apple.com.svg',
]);

export function isMonoIconFile(value) {
  return MONO_ICON_FILES.has(LEGACY_ICON_FILES[value] ?? value);
}

export function isLocalIconFile(value) {
  return typeof value === 'string' && value.length <= 120 && !value.includes('..') && LOCAL_ICON_NAME.test(value);
}

export function localIconURL(value) {
  const file = LEGACY_ICON_FILES[value] ?? value;
  if (!isLocalIconFile(file)) return null;
  try {
    return chrome.runtime.getURL(`assets/site-icons/${file}`);
  } catch {
    return null;
  }
}

export function wideIconURL(mainFile) {
  const wide = WIDE_ICON_FILES[LEGACY_ICON_FILES[mainFile] ?? mainFile];
  return wide ? localIconURL(wide) : null;
}
