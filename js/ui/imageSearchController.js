import { $, toast, report } from './dialogs.js';
import { engines } from '../search/engines.js';
import { imageSearchAdapters, imageFromDrop, copyAndOpenImage } from '../search/imageSearch.js';
import { download } from '../io/exportImport.js';

export function bindImageSearch({ on, getEngine }) {
  let fallbackBlob, fallbackEngine;
  function openFallback(blob, engine, reason) {
    fallbackBlob = blob; fallbackEngine = engine; $('#fallback-message').textContent = reason; $('#fallback-copy').disabled = !blob; $('#fallback-download').disabled = !blob; if (!$('#fallback-dialog').open) $('#fallback-dialog').showModal();
  }
  let dragDepth = 0, imageRequest = 0;
  const resetImageDrag = () => { dragDepth = 0; $('#search-form').classList.remove('drag-over'); };
  const prepareImageSearch = async (load, engine) => {
    const request = ++imageRequest;
    try {
      const blob = await load;
      if (request !== imageRequest) return;
      if (imageSearchAdapters[engine].verified) {
        try {
          await imageSearchAdapters[engine].submit(blob);
          openFallback(blob, engine, '已提交图片。若没有出现识图结果，可复制图片到官方页面继续。');
        } catch { openFallback(blob, engine, '图片未能自动上传。请复制图片，在官方图搜页面粘贴。'); }
      } else openFallback(blob, engine, `已准备好图片。点击“复制图片并打开图搜”，在 ${engines[engine].name} 页面的相机入口粘贴（⌘V / Ctrl+V）。`);
    } catch (error) {
      if (request !== imageRequest) return;
      if (error.message.startsWith('仅支持') || error.message.includes('10MB') || error.message.includes('为空')) report(error);
      else openFallback(null, engine, '网页图片无法读取，可能受到跨域或网络限制。请先保存图片，再打开官方图搜页面上传。');
    }
  };
  on('#image-search-open', 'click', () => {
    const tab = window.open(engines[getEngine()].images, '_blank'); if (tab) tab.opener = null;
    else toast('新页面被拦截，请允许此页面打开新标签页后重试');
  });
  $('#search-form').addEventListener('dragenter', event => { if (event.dataTransfer.types.includes('application/x-easy-tab-site')) return; event.preventDefault(); dragDepth++; $('#search-form').classList.add('drag-over'); });
  $('#search-form').addEventListener('dragover', event => { if (!event.dataTransfer.types.includes('application/x-easy-tab-site')) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; } });
  $('#search-form').addEventListener('dragleave', () => { if (--dragDepth <= 0) resetImageDrag(); });
  $('#search-form').addEventListener('drop', event => {
    if (event.dataTransfer.types.includes('application/x-easy-tab-site')) return;
    event.preventDefault(); resetImageDrag();
    // Read transfer contents immediately, before the browser protects the dropped data.
    prepareImageSearch(imageFromDrop(event.dataTransfer), getEngine());
  });
  window.addEventListener('blur', resetImageDrag);
  document.addEventListener('dragend', resetImageDrag);
  const openOfficialImages = () => {
    const tab = window.open(engines[fallbackEngine].images, '_blank'); if (tab) tab.opener = null;
    return tab;
  };
  on('#fallback-open', 'click', () => { if (!openOfficialImages()) toast('新页面被拦截，请允许此页面打开新标签页后重试'); });
  on('#fallback-copy', 'click', async () => {
    const button = $('#fallback-copy'); if (!fallbackBlob || button.disabled) return;
    button.disabled = true;
    try {
      const { opened } = await copyAndOpenImage(fallbackBlob, fallbackEngine, openOfficialImages);
      if (!opened) $('#fallback-message').textContent = '图片已复制，但新页面被拦截。请点击“打开图搜页面”，在相机入口粘贴（⌘V / Ctrl+V）。';
      else { $('#fallback-dialog').close(); toast('图片已复制，请在官方图搜页面的相机入口粘贴（⌘V / Ctrl+V）'); }
    } catch (error) { $('#fallback-message').textContent = `${error.message || '图片复制失败'}。可保存图片后在官方图搜页面上传。`; }
    finally { button.disabled = !fallbackBlob; }
  });
  on('#fallback-download', 'click', () => {
    if (!fallbackBlob) return;
    const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }[fallbackBlob.type] || 'img';
    download(fallbackBlob, `auretab-search-image.${ext}`);
  });
}
