var CACHE_NAME = "carton-scanner-v52";
var ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

/*
 * Strategy:
 * - Page navigations (opening/reloading the app in a browser tab) go NETWORK-FIRST,
 *   with cache:"no-store" so the browser's own HTTP cache is bypassed too. This means
 *   opening the URL fresh always pulls the latest published version when there's a
 *   connection. Only if the network request fails (genuinely offline) do we fall back
 *   to whatever was last cached, so the installed app still works with no signal.
 * - Static sub-resources (manifest, icons) stay cache-first for speed, since they
 *   rarely change and aren't what carries new app versions.
 */
self.addEventListener("fetch", function(event){
  var req = event.request;
  var isNavigation = req.mode === "navigate" ||
    (req.method === "GET" && req.headers.get("accept") && req.headers.get("accept").indexOf("text/html") !== -1);

  if(isNavigation){
    event.respondWith(
      fetch(req, {cache: "no-store"}).then(function(resp){
        var copy = resp.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
        return resp;
      }).catch(function(){
        return caches.match(req).then(function(cached){
          return cached || caches.match("./index.html");
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function(cached){
      if(cached) return cached;
      return fetch(req).then(function(resp){
        var copy = resp.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
        return resp;
      }).catch(function(){});
    })
  );
});
