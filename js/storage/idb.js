let database;
function open() {
  return database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('easy-tab-assets', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('blobs');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = undefined; reject(request.error); };
  });
}
async function transaction(mode, action) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('blobs', mode); let result;
    const request = action(tx.objectStore('blobs'));
    if (request) request.onsuccess = () => { result = request.result; };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('图片存储事务已中止'));
  });
}
export const assetStore = {
  get: key => transaction('readonly', store => store.get(key)),
  put: (key, blob) => transaction('readwrite', store => store.put(blob, key)),
  delete: key => transaction('readwrite', store => store.delete(key)),
  /** A single transaction makes an imported batch all-or-nothing. */
  putMany: entries => transaction('readwrite', store => { for (const [key, blob] of entries) store.put(blob, key); }),
};
