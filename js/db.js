const DB_NAME = "workout-tracker";
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function requestToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("aborted"));
  });
}

export async function loadAll() {
  const db = await openDB();
  const tx = db.transaction("kv", "readonly");
  const store = tx.objectStore("kv");
  const keys = ["plan", "workouts", "weighins", "steps", "settings"];
  const values = await Promise.all(keys.map((k) => requestToPromise(store.get(k))));
  await txDone(tx);
  db.close();
  const data = Object.fromEntries(keys.map((k, i) => [k, values[i]]));
  return {
    plan: data.plan || null,
    workouts: Array.isArray(data.workouts) ? data.workouts : [],
    weighins: Array.isArray(data.weighins) ? data.weighins : [],
    steps: data.steps && typeof data.steps === "object" ? data.steps : {},
    settings: data.settings || null,
  };
}

export async function saveAll(data) {
  const db = await openDB();
  const tx = db.transaction("kv", "readwrite");
  const store = tx.objectStore("kv");
  store.put(data.plan, "plan");
  store.put(data.workouts, "workouts");
  store.put(data.weighins, "weighins");
  store.put(data.steps, "steps");
  store.put(data.settings, "settings");
  await txDone(tx);
  db.close();
}
