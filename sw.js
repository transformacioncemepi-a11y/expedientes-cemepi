/* Service worker de Expedientes CEMEPI.
   Solo guarda los archivos propios de la app (pantallas, código e íconos) para abrir más rápido.
   NUNCA guarda datos: las consultas a Supabase y a otros sitios pasan directo por la red.
   Estrategia "red primero": siempre se intenta la versión más reciente; la copia solo se usa sin conexión. */
const VERSION = "cemepi-v39";
const ARCHIVOS = ["./", "./index.html", "./contenidos.js", "./estilos.css", "./supabase-puente.js", "./config.js", "./manifest.webmanifest",
  "./iconos/icono-192.png", "./iconos/icono-512.png", "./iconos/apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;   /* datos y CDN: sin tocar */
  if (url.pathname.endsWith("/consulta.html")) return;                             /* el portal no se guarda */
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const copia = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copia)); } return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match("./index.html"))));
});
