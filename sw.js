const CACHE = "wt-v9";
const ASSETS = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/app.js",
  "./js/render.js",
  "./js/logic.js",
  "./js/plan.js",
  "./js/db.js",
  "./js/coach.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/icon-512-maskable.png",
  "./data/coach.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const isCoach = url.pathname.endsWith("/data/coach.json") || url.pathname.endsWith("/coach.json");
  event.respondWith(networkFirst(req, isCoach));
});

async function networkFirst(req, isCoach) {
  const cache = await caches.open(CACHE);
  const stable = isCoach ? new Request(new URL("./data/coach.json", self.registration.scope).toString()) : req;
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(stable, res.clone());
    return res;
  } catch (err) {
    const hit = (await cache.match(stable)) || (await cache.match(req, { ignoreSearch: true }));
    if (hit) return hit;
    if (req.mode === "navigate") {
      return (await cache.match("./index.html")) || (await cache.match("./")) || Promise.reject(err);
    }
    throw err;
  }
}
