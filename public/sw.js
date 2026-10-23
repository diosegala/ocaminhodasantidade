// Service worker do Caminho: guarda o app no aparelho para abrir sem internet.
// Os dados (Bíblia, liturgia, lectios) ficam no IndexedDB, pelo React Query.
// Mude VERSION só quando a lógica deste arquivo mudar.
const VERSION = "v3";
const SHELL = `shell-${VERSION}`;
const ASSETS = "assets";
const DATA = "data";
const MAX_ASSETS = 200;
const NAV_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) =>
        c.addAll(["/", "/manifest.webmanifest", "/icon-192.png", "/apple-touch-icon.png"]),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          // Apaga versões antigas e o cache de fontes, que não é mais usado.
          keys
            .filter((k) => (k.startsWith("shell-") && k !== SHELL) || k === "fonts")
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate") {
    event.respondWith(navigate(req));
  } else if (url.origin === self.location.origin && url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(req));
  } else if (url.origin === self.location.origin && url.pathname === "/catecismo.json") {
    event.respondWith(dataFirst(req));
  }
  // O resto (Supabase, funções do servidor) vai direto para a rede.
});

// Páginas: tenta a rede primeiro; se demorar ou falhar, usa a cópia guardada.
async function navigate(req) {
  const cache = await caches.open(SHELL);
  const network = fetch(req).then((res) => {
    if (res.ok && res.type === "basic") void cache.put(req, res.clone());
    return res;
  });
  const timeout = new Promise((resolve) => setTimeout(resolve, NAV_TIMEOUT_MS, null));
  try {
    const res = await Promise.race([network, timeout]);
    if (res) return res;
  } catch {
    // sem rede: cai para o cache abaixo
  }
  const cached = (await cache.match(req, { ignoreSearch: true })) || (await cache.match("/"));
  if (cached) return cached;
  return network; // nada guardado: espera a rede mesmo
}

// Arquivos do build têm hash no nome, então nunca mudam: cache primeiro.
async function cacheFirst(req) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok) {
    await cache.put(req, res.clone());
    void trim(cache);
  }
  return res;
}

// Dados grandes e estáveis (Catecismo): guardados após o primeiro uso. O endereço leva
// "?v=N"; ao mudar a versão, a cópia antiga do mesmo arquivo é apagada.
async function dataFirst(req) {
  const cache = await caches.open(DATA);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok) {
    const path = new URL(req.url).pathname;
    for (const key of await cache.keys()) {
      if (new URL(key.url).pathname === path) await cache.delete(key);
    }
    await cache.put(req, res.clone());
  }
  return res;
}

// Remove os arquivos mais antigos de versões passadas do app.
async function trim(cache) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ASSETS))) await cache.delete(key);
}

// Notificações (aviso diário da lectio). O servidor manda { title, body, url, tag }.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Caminho", {
      body: data.body || "A Palavra de hoje espera por você.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "caminho",
      data: { url: data.url || "/" },
    }),
  );
});

// Ao tocar: volta para o app já aberto, se houver, ou abre um novo.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          return client.focus().then((c) => ("navigate" in c ? c.navigate(url) : c));
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
