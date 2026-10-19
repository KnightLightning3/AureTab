let database;
function open() {
  return database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('easy-tab-assets');
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('blobs')) request.result.createObjectStore('blobs');
    };
    request.onsuccess = () => {
      const db = request.result;
      const reset = () => { database = undefined; };
      db.onversionchange = () => { db.close(); reset(); };
      // A closed connection (I/O error or browser shutdown path) must not be reused.
      db.onclose = reset;
      resolve(db);
    };
    request.onerror = () => { database = undefined; reject(request.error); };
  });
}
async function run(storeName, mode, action, timeout) {
  const db = await open();
  return new Promise((resolve, reject) => {
    let tx, timer = null, settled = false;
    const finish = (settle, value) => {
      if (settled) return; settled = true;
      if (timer) clearTimeout(timer);
      settle(value);
    };
    try { tx = db.transaction(storeName, mode); } catch (error) { reject(error); return; }
    if (timeout) timer = setTimeout(() => { try { tx.abort(); } catch {} finish(reject, new Error('图片存储超时')); }, timeout);
    let result, request;
    try { request = action(tx.objectStore(storeName)); } catch (error) { try { tx.abort(); } catch {} finish(reject, error); return; }
    if (request) request.onsuccess = () => { result = request.result; };
    tx.oncomplete = () => finish(resolve, result);
    tx.onerror = () => finish(reject, tx.error);
    tx.onabort = () => finish(reject, tx.error ?? new Error('图片存储事务已中止'));
  });
}
async function transaction(storeName, mode, action, timeout = 0) {
  try { return await run(storeName, mode, action, timeout); }
  catch (error) {
    // The cached connection may have been closed underneath us; retry once.
    if (error?.name !== 'InvalidStateError') throw error;
    database = undefined;
    return run(storeName, mode, action, timeout);
  }
}
export const assetStore = {
  get: key => transaction('blobs', 'readonly', store => store.get(key)),
  keys: () => transaction('blobs', 'readonly', store => store.getAllKeys()),
  put: (key, blob, timeout = 8000) => transaction('blobs', 'readwrite', store => store.put(blob, key), timeout),
  delete: key => transaction('blobs', 'readwrite', store => store.delete(key), 8000),
  putMany: entries => transaction('blobs', 'readwrite', store => { for (const [key, blob] of entries) store.put(blob, key); }, 15000),
};
