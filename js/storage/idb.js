let database;
function open() {
  return database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('easy-tab-assets');
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('blobs')) request.result.createObjectStore('blobs');
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); database = undefined; };
      resolve(db);
    };
    request.onerror = () => { database = undefined; reject(request.error); };
  });
}
async function transaction(storeName, mode, action, timeout = 0) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode); let result;
    const timer = timeout ? setTimeout(() => { try { tx.abort(); } catch {} reject(new Error('图片存储超时')); }, timeout) : null;
    const request = action(tx.objectStore(storeName));
    if (request) request.onsuccess = () => { result = request.result; };
    tx.oncomplete = () => { if (timer) clearTimeout(timer); resolve(result); };
    tx.onerror = () => { if (timer) clearTimeout(timer); reject(tx.error); };
    tx.onabort = () => { if (timer) clearTimeout(timer); reject(tx.error ?? new Error('图片存储事务已中止')); };
  });
}
export const assetStore = {
  get: key => transaction('blobs', 'readonly', store => store.get(key)),
  put: (key, blob, timeout = 0) => transaction('blobs', 'readwrite', store => store.put(blob, key), timeout),
  delete: key => transaction('blobs', 'readwrite', store => store.delete(key)),
  putMany: entries => transaction('blobs', 'readwrite', store => { for (const [key, blob] of entries) store.put(blob, key); }),
};
