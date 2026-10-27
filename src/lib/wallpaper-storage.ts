const DB_NAME = "kiraquest-wallpapers";
const STORE_NAME = "images";
const DB_VERSION = 1;

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("IndexedDB недоступна в этом браузере.")); return; }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Не удалось открыть хранилище изображений."));
  });
}

export async function saveWallpaper(id: string, blob: Blob): Promise<void> {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put({ id, blob, updatedAt: Date.now() });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Не удалось сохранить изображение."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Сохранение изображения отменено."));
  }).finally(() => db.close());
}

export async function loadWallpaper(id: string): Promise<Blob | null> {
  const db = await database();
  return new Promise<Blob | null>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result?.blob instanceof Blob ? request.result.blob : null);
    request.onerror = () => reject(request.error ?? new Error("Не удалось загрузить изображение."));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error("Не удалось прочитать хранилище изображений.")); };
  });
}
