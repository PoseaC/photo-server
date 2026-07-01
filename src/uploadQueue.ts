// Shared IndexedDB upload queue.
//
// Used by BOTH the page (src/uploadManager.ts) and the service worker
// (src/sw.ts). Selected files are persisted here so an upload survives a page
// reload or the worker being killed and restarted.
//
// The records are WRITTEN from the page (see uploadManager.startBackgroundUpload)
// because a File obtained from an <input> is only reliably readable in the
// document that owns it. Persisting the File in the service worker after a
// postMessage transfer intermittently fails on Android with
// "DataError: Failed to write blobs (InvalidBlob)"; writing from the page
// avoids that. The worker only READS the persisted (IndexedDB-owned) bytes.

export const DB_NAME = "wedding-uploads";
export const STORE = "queue";

export interface QueueRecord {
  id?: number;
  name: string;
  size: number;
  key: string;
  file: File;
  done: 0 | 1;
}

export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function awaitTx(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function addRecords(files: File[], key: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const file of files) {
      const record: QueueRecord = { name: file.name, size: file.size, key, file, done: 0 };
      store.add(record);
    }
    await awaitTx(tx);
  } finally {
    db.close();
  }
}

export async function getAllRecords(): Promise<QueueRecord[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    return await new Promise<QueueRecord[]>((resolve, reject) => {
      req.onsuccess = () => resolve((req.result || []) as QueueRecord[]);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function markDone(id: number): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const getReq = store.get(id);
    await new Promise<void>((resolve, reject) => {
      getReq.onsuccess = () => {
        const record = getReq.result as QueueRecord | undefined;
        if (record) {
          record.done = 1;
          store.put(record);
        }
        resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
    await awaitTx(tx);
  } finally {
    db.close();
  }
}

export async function clearAll(): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    await awaitTx(tx);
  } finally {
    db.close();
  }
}
